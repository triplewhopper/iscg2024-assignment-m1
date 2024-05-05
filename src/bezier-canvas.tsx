import React from 'react';
import { vec3, mat4 } from 'gl-matrix';
import { WebGLAttributes, WebGLUniforms, getAttribLocations, enableVertexAttribArray, getUniformLocations } from './webgl-utils';
import { evaluateBezierCurve, adaptiveSubdivision } from './bezier';
import { FloatingPosInfo } from './floating-pos-info';

const vs_src = `
attribute vec3 a_vertex;
attribute vec3 a_color;
attribute float a_size;
varying vec3 v_color;
uniform mat4 u_modelview;
uniform mat4 u_projection;
void main() {
        gl_Position = u_projection * u_modelview * vec4(a_vertex, 1.0);
        gl_PointSize = a_size;
        v_color = a_color;
}
`
const fs_src = `
precision mediump float;
varying vec3 v_color;
void main(void) {
        gl_FragColor = vec4(v_color, 1.0);
}
`
function findFocus(x: number, y: number, controlPoints: readonly [number, number, 0][]) {
    for (let i = 0; i < controlPoints.length; i++) {
        const [cx, cy, _] = controlPoints[i];
        const dx = x - cx;
        const dy = y - cy;
        if (dx * dx + dy * dy < 0.01) {
            return i;
        }
    }
    return null;
}

function fillVertices(samplePoints: readonly vec3[], controlPoints: readonly vec3[]) {
    const vertices = new Float32Array(samplePoints.length * 3 + controlPoints.length * 3);
    for (let i = 0; i < samplePoints.length; i++) vertices.set(samplePoints[i], i * 3);
    for (let i = 0; i < controlPoints.length; i++) vertices.set(controlPoints[i], samplePoints.length * 3 + i * 3);
    return vertices;
}
function fillColors(samplePoints: readonly vec3[], controlPoints: readonly vec3[]) {
    const colors = new Float32Array(samplePoints.length * 3 + controlPoints.length * 3);
    for (let i = 0; i < samplePoints.length; i++) colors.set([1, 0.6, 0.2], i * 3);
    for (let i = 0; i < controlPoints.length; i++) colors.set([0.2, 0.5, 1], samplePoints.length * 3 + i * 3);
    return colors;
}
function fillSizes(samplePoints: readonly vec3[], controlPoints: readonly vec3[], focus: number | null) {
    const sizes = new Float32Array(samplePoints.length + controlPoints.length);
    sizes.fill(5);
    if (focus !== null) sizes[samplePoints.length + focus] = 10;
    return sizes;
}

function geometry(controlPoints: readonly [number, number, 0][], nSteps: number) {
    return evaluateBezierCurve(controlPoints, Array.from({ length: nSteps }, (_, i) => i / (nSteps - 1)));
}

function draw(
    gl: WebGLRenderingContext,
    attributes: WebGLAttributes<['vertex', 'color', 'size']>,
    uniforms: WebGLUniforms<['projection', 'modelview']>,
    translation: vec3 | null,
    samplePoints: vec3[],
    focus: number | null,
    config: BezierCurve2DConfig,
) {
    gl.clearColor(1, 1, 1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const vertices = fillVertices(samplePoints, config.controlPoints);
    const colors = fillColors(samplePoints, config.controlPoints);
    const sizes = fillSizes(samplePoints, config.controlPoints, focus);

    const vertex_buffer = gl.createBuffer();
    const color_buffer = gl.createBuffer();
    const size_buffer = gl.createBuffer();
    if (!vertex_buffer || !color_buffer || !size_buffer) {
        throw new Error('Buffer creation failed');
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertex_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);
    gl.vertexAttribPointer(attributes.vertex, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, color_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
    gl.vertexAttribPointer(attributes.color, 3, gl.FLOAT, false, 0, 0);

    gl.bindBuffer(gl.ARRAY_BUFFER, size_buffer);
    gl.bufferData(gl.ARRAY_BUFFER, sizes, gl.STATIC_DRAW);
    gl.vertexAttribPointer(attributes.size, 1, gl.FLOAT, false, 0, 0);

    gl.uniformMatrix4fv(uniforms.modelview, false, mat4.identity(mat4.create()));
    const t = mat4.fromTranslation(mat4.identity(mat4.create()), translation ?? vec3.create());
    gl.uniformMatrix4fv(uniforms.projection, false, t);

    gl.drawArrays(gl.LINE_STRIP, 0, samplePoints.length);
    if (config.showSamplePoints) {
        gl.drawArrays(gl.POINTS, 0, samplePoints.length);
    }
    if (config.showControlPoints) {
        gl.drawArrays(gl.LINE_STRIP, samplePoints.length, config.controlPoints.length);
        gl.drawArrays(gl.POINTS, samplePoints.length, config.controlPoints.length);
    }
    gl.deleteBuffer(vertex_buffer);
    gl.deleteBuffer(color_buffer);
    gl.deleteBuffer(size_buffer);
}

export type BezierCurve2DConfig = {
    readonly tag: 'Bézier',
    readonly showControlPoints: boolean,
    readonly showSamplePoints: boolean,
    readonly controlPoints: readonly [number, number, 0][],
    readonly setControlPoints: React.Dispatch<React.SetStateAction<readonly [number, number, 0][]>>,
} & ({
    readonly adaptiveSubdivision: false,
    readonly nSteps: number,
} | {
    readonly adaptiveSubdivision: true,
    readonly nSteps: number | null,
    readonly setNSteps: React.Dispatch<React.SetStateAction<number | null>>,
});

type event = React.MouseEvent<HTMLCanvasElement>;

export function BezierCurveCanvas({ config, canvasSize }: { config: BezierCurve2DConfig, canvasSize: readonly [number, number] }) {
    type CursorState = { cursorStyle: 'grab' } | {
        cursorStyle: 'pointer' | 'move',
        focus: number, // index of the control point being dragged
    } | {
        cursorStyle: 'grabbing',
        translateFrom: [number, number, 0],
        translation: [number, number, 0],
    }
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const [gl, setGL] = React.useState<WebGLRenderingContext | null>(null);
    const [attributes, setAttributes] = React.useState<WebGLAttributes<['vertex', 'color', 'size']> | null>(null);
    const [uniforms, setUniforms] = React.useState<WebGLUniforms<['projection', 'modelview']> | null>(null);
    const [cursor, setCursor] = React.useState<CursorState>({ cursorStyle: 'grab' });

    const [leftClicked, setLeftClicked] = React.useState(false);
    const [uv, setUV] = React.useState<[number, number] | null>(null);
    const [xy, setXY] = React.useState<[number, number] | null>(null);

    function onmousemove(e: event) {
        const canvas = e.currentTarget;
        const rect = canvas.getBoundingClientRect();
        const u = e.clientX - rect.left;
        const v = e.clientY - rect.top;
        const x = 2 * u / canvas.width - 1;
        const y = 1 - 2 * v / canvas.height;
        setUV([u, v]);
        setXY([x, y]);
    }

    React.useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const gl = canvas.getContext('webgl');
        if (!gl) throw new Error('WebGL not supported');
        setGL(gl);
    }, []);

    const program = React.useMemo(() => {
        if (!gl) return null;
        const vs = gl.createShader(gl.VERTEX_SHADER);
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        if (!vs || !fs) {
            throw new Error('Shader creation failed');
        }
        gl.shaderSource(vs, vs_src);
        gl.shaderSource(fs, fs_src);
        gl.compileShader(vs);
        gl.compileShader(fs);
        const program = gl.createProgram()!;
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);
        gl.useProgram(program);
        setGL(gl);
        return program;
    }, [gl]);

    React.useEffect(() => {
        if (!gl || !program || !canvasRef.current) return;
        const attributes = getAttribLocations(gl, program, ['vertex', 'color', 'size'] as const);
        const uniforms = getUniformLocations(gl, program, ['modelview', 'projection'] as const);
        enableVertexAttribArray(gl, attributes);
        gl.viewport(0, 0, canvasRef.current.width, canvasRef.current.height);
        console.log('webgl loaded');
        setAttributes(attributes);
        setUniforms(uniforms);
    }, [gl, program]);

    React.useEffect(() => {
        if (!xy) return;
        switch (cursor.cursorStyle) {
            case 'grab':
                if (leftClicked) {
                    setCursor({ cursorStyle: 'grabbing', translateFrom: [xy[0], xy[1], 0], translation: [0, 0, 0] });
                } else {
                    const newFocus = config.showControlPoints ? findFocus(xy[0], xy[1], config.controlPoints) : null;
                    if (newFocus !== null) {
                        setCursor({ cursorStyle: 'pointer', focus: newFocus });
                    }
                }
                break;
            case 'pointer':
                if (leftClicked) {
                    setCursor({ cursorStyle: 'move', focus: cursor.focus });
                } else {
                    const newFocus = config.showControlPoints ? findFocus(xy[0], xy[1], config.controlPoints) : null;
                    if (newFocus === null) {
                        setCursor({ cursorStyle: 'grab' });
                    } else if (newFocus !== cursor.focus) {
                        setCursor({ cursorStyle: 'pointer', focus: newFocus });
                    }
                }
                break;
            case 'move':
                // if (focus === null) throw new Error('focus is null');
                if (leftClicked) {
                    const newControlPoints = [...config.controlPoints];
                    newControlPoints[cursor.focus] = [xy[0], xy[1], 0];
                    config.setControlPoints(newControlPoints);
                } else {
                    setCursor({ cursorStyle: 'pointer', focus: cursor.focus });
                }
                break;
            case 'grabbing':
                const translation = [xy[0], xy[1], 0] as [number, number, 0];
                vec3.sub(translation, translation, cursor.translateFrom);
                if (leftClicked) {
                    setCursor({ cursorStyle: 'grabbing', translateFrom: cursor.translateFrom, translation });
                } else {
                    const newControlPoints = config.controlPoints.map(([x, y, z]) => [x + translation[0], y + translation[1], z]) as readonly [number, number, 0][];
                    config.setControlPoints(newControlPoints);
                    setCursor({ cursorStyle: 'grab' });
                }
                break;
        }
    }, [xy, leftClicked]);

    const translation = React.useMemo(() => {
        return cursor.cursorStyle === 'grabbing' ? cursor.translation : null;
    }, [cursor]);

    const focus = React.useMemo(() => {
        if (cursor.cursorStyle === 'pointer' || cursor.cursorStyle === 'move') {
            return cursor.focus;
        } else {
            return null;
        }
    }, [cursor]);

    React.useEffect(() => {
        if (!gl || !attributes || !uniforms) return;
        if (config.adaptiveSubdivision) {
            const samplePoints = adaptiveSubdivision(config.controlPoints);
            config.setNSteps(samplePoints.length);
            draw(gl, attributes, uniforms, translation, samplePoints, focus, config);
        } else {
            draw(gl, attributes, uniforms, translation, geometry(config.controlPoints, config.nSteps), focus, config);
        }
    }, [gl, attributes, uniforms, translation, focus, config, config.controlPoints, config.nSteps, config.showControlPoints, config.showSamplePoints, config.adaptiveSubdivision]);

    return (
        <>
            <div style={{ position: 'relative' }}>
                <canvas
                    ref={canvasRef}
                    id="canvas" width={canvasSize[0]} height={canvasSize[1]}
                    onMouseLeave={() => { setXY(null); setUV(null); }}
                    onMouseMove={onmousemove}
                    onMouseDown={e => e.button === 0 && setLeftClicked(true)}
                    onMouseUp={e => e.button === 0 && setLeftClicked(false)}
                    onContextMenu={(e) => {
                        e.preventDefault();
                        if (xy && cursor.cursorStyle === 'grab' && config.showControlPoints) {
                            config.setControlPoints([...config.controlPoints, [xy[0], xy[1], 0]]);
                        }
                        return false;
                    }}
                    style={{
                        border: '1px solid black',
                        cursor: cursor.cursorStyle,
                    }}>
                </canvas>
                <FloatingPosInfo uv={uv} xy={xy} />
            </div>
        </>);

}
