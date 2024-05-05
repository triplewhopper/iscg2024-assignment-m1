import { vec2, vec3, vec4, mat2, mat3, mat4 } from 'gl-matrix';

type UniformType = '1f' | '1i' | '2f' | '2i' | '3f' | '3i' | '4f' | '4i' | 'Matrix2f' | 'Matrix3f' | 'Matrix4f';
type UniformValueType<T extends UniformType> = 
    T extends '1f' | '1i' ? number :
    T extends '2f' | '2i' ? vec2 :
    T extends '3f' | '3i' ? vec3 :
    T extends '4f' ? vec4 :
    T extends 'Matrix2f' ? mat2 :
    T extends 'Matrix3f' ? mat3 :
    T extends 'Matrix4f' ? mat4 :
    never;
type Attribute<T extends string> = `a_${T}`;

class Uniform<T extends UniformType>{
    readonly location: WebGLUniformLocation;
    readonly type: T;
    readonly is_array: false;
    private _value: UniformValueType<T>;
    private stack: UniformValueType<T>[];
    private copy: () => UniformValueType<T>;
    setUniform: (gl: WebGLRenderingContext) => void;
    constructor(type: T, location: WebGLUniformLocation) {
        this.location = location;
        this.type = type;
        this.is_array = false;
        this.stack = [];
        type t = UniformValueType<T>;
        if (type === '1f' || type === '1i') {
            this._value = 0 as t;
            this.copy = () => this._value as t;
            this.setUniform = type === '1f' ? (gl) => gl.uniform1f(location, this._value as number) : (gl) => gl.uniform1i(location, this._value as number);
        } else if (type === '2f' || type === '2i') {
            this._value = vec2.create() as t;
            this.copy = () => vec2.clone(this._value as vec2) as t;
            this.setUniform = type === '2f' ? (gl) => gl.uniform2fv(location, this._value as vec2) : (gl) => gl.uniform2iv(location, this._value as vec2);
        } else if (type === '3f' || type === '3i') {
            this._value = vec3.create() as t;
            this.copy = () => vec3.clone(this._value as vec3) as t;
            this.setUniform = type === '3f' ? (gl) => gl.uniform3fv(location, this._value as vec3) : (gl) => gl.uniform3iv(location, this._value as vec3);
        } else if (type === '4f' || type === '4i') {
            this._value = vec4.create() as t;
            this.copy = () => vec4.clone(this._value as vec4) as t;
            this.setUniform = type === '4f' ? (gl) => gl.uniform4fv(location, this._value as vec4) : (gl) => gl.uniform4iv(location, this._value as vec4);
        } else if (type === 'Matrix2f') {
            this._value = mat2.create() as t;
            this.copy = () => mat2.clone(this._value as mat2) as t;
            this.setUniform = (gl) => gl.uniformMatrix2fv(location, false, this._value as mat2);
        } else if (type === 'Matrix3f') {
            this._value = mat3.create() as t;
            this.copy = () => mat3.clone(this._value as mat3) as t;
            this.setUniform = (gl) => gl.uniformMatrix3fv(location, false, this._value as mat3);
        } else {
            this._value = mat4.create() as t;
            this.copy = () => mat4.clone(this._value as mat4) as t;
            this.setUniform = (gl) => gl.uniformMatrix4fv(location, false, this._value as mat4);
        }
    }

    push() {
        this.stack.push(this.copy());
    }

    pop() {
        const v = this.stack.pop();
        if (v === undefined) {
            throw new Error('Stack underflow');
        }
        this._value = v;
    }

    get value() {
        return this._value;
    }
}
class UniformArray<T extends UniformType> {
    readonly location: WebGLUniformLocation;
    readonly type: T;
    readonly is_array: true;
    private _value: UniformValueType<T>[];
    setUniform: (gl: WebGLRenderingContext) => void;
    constructor(type: T, location: WebGLUniformLocation, size: number) {
        this.location = location;
        this.type = type;
        this.is_array = true;
        this._value = [];
        for (let i = 0; i < size; ++i) {
            this._value.push(this.makeDefaultValue());
        }
        if (type === '1f') {
            this.setUniform = (gl) => gl.uniform1fv(location, this._value as number[]);
        } else if (type === '1i') {
            this.setUniform = (gl) => gl.uniform1iv(location, this._value as number[]);
        } else if (type === '2f') {
            this.setUniform = (gl) => gl.uniform2fv(location, this._value.flat(1) as number[]);
        } else if (type === '2i') {
            this.setUniform = (gl) => gl.uniform2iv(location, this._value.flat(1) as number[]);
        } else if (type === '3f') {
            this.setUniform = (gl) => gl.uniform3fv(location, this._value.flat(1) as number[]);
        } else if (type === '3i') {
            this.setUniform = (gl) => gl.uniform3iv(location, this._value.flat(1) as number[]);
        } else if (type === '4f') {
            this.setUniform = (gl) => gl.uniform4fv(location, this._value.flat(1) as number[]);
        } else if (type === '4i') {
            this.setUniform = (gl) => gl.uniform4iv(location, this._value.flat(1) as number[]);
        } else if (type === 'Matrix2f') {
            this.setUniform = (gl) => gl.uniformMatrix2fv(location, false, this._value.flat(1) as number[]);
        } else if (type === 'Matrix3f') {
            this.setUniform = (gl) => gl.uniformMatrix3fv(location, false, this._value.flat(1) as number[]);
        } else {
            this.setUniform = (gl) => gl.uniformMatrix4fv(location, false, this._value.flat(1) as number[]);
        }
    }

    private makeDefaultValue(): UniformValueType<T> {
        type t = UniformValueType<T>;
        if (this.type === '1f' || this.type === '1i') {
            return 0 as t;
        } else if (this.type === '2f' || this.type === '2i') {
            return vec2.create() as t;
        } else if (this.type === '3f' || this.type === '3i') {
            return vec3.create() as t;
        } else if (this.type === '4f' || this.type === '4i') {
            return vec4.create() as t;
        } else if (this.type === 'Matrix2f') {
            return mat2.create() as t;
        } else if (this.type === 'Matrix3f') {
            return mat3.create() as t;
        } else {
            return mat4.create() as t;
        }    
    }

    get value() {
        return this._value;
    }

}

class LegacyGL {
    private readonly gl: WebGLRenderingContext;
    private readonly shader: { vertex_shader: WebGLShader, fragment_shader: WebGLShader, program: WebGLProgram};
    private uniforms: {[key: string]: Uniform<UniformType> | UniformArray<UniformType>};
    private vertex_attributes: {
            name: string,
            size: number,
            current: number[],
            location: number,
            array: number[]
        }[];
    private mode: number;
    private QUADS: number;
    private displists: {
        [key: string]: { 
            name: string, 
            drawcalls: { 
                buffers: WebGLBuffer[], 
                mode: number, 
                num_vertices: number 
            }[]
        }
    };
    private current_displist_name: string;
    private flags: {[key: string]: boolean};

    constructor(gl: WebGLRenderingContext, vertex_shader_src: string, fragment_shader_src: string) {
        this.gl = gl;
        this.shader = this.init_shader(vertex_shader_src, fragment_shader_src);
        this.uniforms = {};
        this.vertex_attributes = [];
        this.mode = 0;
        this.QUADS = 0;
        this.displists = {};
        this.current_displist_name = '';
        this.flags = {};
    }

    private init_shader(vertex_shader_src: string, fragment_shader_src: string) {
        const gl = this.gl;
        // vertex shader
        const vertex_shader = gl.createShader(gl.VERTEX_SHADER)!;
        gl.shaderSource(vertex_shader, vertex_shader_src);
        gl.compileShader(vertex_shader);
        if (!gl.getShaderParameter(vertex_shader, gl.COMPILE_STATUS))
            throw new Error(gl.getShaderInfoLog(vertex_shader)??'');

        // fragment shader
        const fragment_shader = gl.createShader(gl.FRAGMENT_SHADER)!;
        gl.shaderSource(fragment_shader, fragment_shader_src);
        gl.compileShader(fragment_shader);
        if (!gl.getShaderParameter(fragment_shader, gl.COMPILE_STATUS))
            throw new Error(gl.getShaderInfoLog(fragment_shader)??'');

        // shader program
        const program = gl.createProgram()!;
        gl.attachShader(program, vertex_shader);
        gl.attachShader(program, fragment_shader);
        gl.linkProgram(program);
        gl.useProgram(program);
        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            throw new Error('Could not initialize shaders!');
        }

        return { vertex_shader, fragment_shader, program };
    }

    add_uniform<T extends UniformType>(name: string, type: T) {
        const location = this.gl.getUniformLocation(this.shader.program, `u_${name}`);
        if (location === null) {
            throw new Error(`Uniform ${name} not found`);
        }
        this.uniforms[name] = new Uniform(type, location);
    }

    add_uniform_array<T extends UniformType>(name: string, type: T, size: number) {
        const location = this.gl.getUniformLocation(this.shader.program, `u_${name}`);
        if (location === null) {
            throw new Error(`Uniform ${name} not found`);
        }
        this.uniforms[name] = new UniformArray(type, location, size);
    }

    set_uniforms() {
        for (const name in this.uniforms) {
            // call appropriate WebGL function depending on data type
            this.uniforms[name].setUniform(this.gl);
        }
    }

    add_vertex_attribute(name: string, size: number) {
        var vertex_attribute = { 
            name, 
            size, 
            current: new Array<number>(size).fill(0),
            location: this.gl.getAttribLocation(this.shader.program, `a_${name}`),
            array: []
        };
        // initialize current value with 0
        // vertex_attribute.current = [];
        // for (var i = 0; i < size; ++i)
        //     vertex_attribute.current.push(0);
        // register current value setter func
        // this[name] = function(...args: number[]) {
            // vertex_attribute.current = args.slice(0, size);
            // for (var i = 0; i < size; ++i)
            //     vertex_attribute.current[i] = args[i];
        // };
        // shader location
        // vertex_attribute.location = this.gl.getAttribLocation(this.shader.program, `a_${name}`);
        this.gl.enableVertexAttribArray(vertex_attribute.location);
        // add to the list
        this.vertex_attributes.push(vertex_attribute);
    }

    vertex(x: number, y: number, z: number) {
        for (const vertex_attribute of this.vertex_attributes) {
            const value = vertex_attribute.name === "vertex" ? [x, y, z] : vertex_attribute.current;
            for (let j = 0; j < vertex_attribute.size; ++j)
                vertex_attribute.array.push(value[j]);
        }
        // emulate GL_QUADS
        const num_vertices = this.vertex_attributes[0].array.length / 3;
        if (this.mode == this.QUADS && num_vertices % 6 == 4) {         // 6 vertices per quad (= 2 triangles)
            const v0 = num_vertices - 4;
            // add 2 vertices identical to [v0] and [v0+2] to construct the other half of the quad
            for (let k = 0; k < 3; ++k) {
                if (k == 1)
                    continue;
                for (const vertex_attribute of this.vertex_attributes) {
                    for (var j = 0; j < vertex_attribute.size; ++j)
                        vertex_attribute.array.push(vertex_attribute.array[vertex_attribute.size * (v0 + k) + j]);
                }
            }
        }
    }

    begin(mode: number) {
        this.set_uniforms();
        this.mode = mode;
        for (const vertex_attribute of this.vertex_attributes) {
            vertex_attribute.array = [];
        }
    }

    end() {
        var drawcall = {
            buffers      : [] as WebGLBuffer[],
            mode         : this.mode == this.QUADS ? this.gl.TRIANGLES : this.mode,
            num_vertices : this.vertex_attributes[0].array.length / 3,
        };
        for (const vertex_attribute of this.vertex_attributes) {
            var buffer = this.gl.createBuffer()!;
            this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
            drawcall.buffers.push(buffer);
            // simulate GL_AUTO_NORMAL
            if (drawcall.mode === this.gl.TRIANGLES && vertex_attribute.name === "normal" && this.flags.AUTO_NORMAL) {
                const array = this.vertex_attributes[0].array;
                for (let i = 0; i < drawcall.num_vertices / 3; ++i) {
                    const v = [];
                    v.push(array.slice(9 * i, 9 * i + 3) as vec3);
                    v.push(array.slice(9 * i + 3, 9 * i + 6) as vec3);
                    v.push(array.slice(9 * i + 6, 9 * i + 9) as vec3);
                    vec3.sub(v[1], v[1], v[0]);
                    vec3.sub(v[2], v[2], v[0]);
                    // vec3.sub_ip(v[1], v[0]);
                    // vec3.sub_ip(v[2], v[0]);
                    // var n = vec3.cross([], v[1], v[2]);
                    // vec3.normalize_ip(n);
                    // for (var j = 0; j < 3; ++j)
                    //     vertex_attribute.array.splice(3 * (3 * i + j), 3, n[0], n[1], n[2]);

                    const n = vec3.create();
                    vec3.cross(n, v[1], v[2]);
                    vec3.normalize(n, n);

                    vertex_attribute.array.splice(9 * i, 3, n[0], n[1], n[2]);
                    vertex_attribute.array.splice(9 * i + 3, 3, n[0], n[1], n[2]);
                    vertex_attribute.array.splice(9 * i + 6, 3, n[0], n[1], n[2]);
                }
            }
            this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(vertex_attribute.array), this.gl.STATIC_DRAW);
            this.gl.vertexAttribPointer(vertex_attribute.location, vertex_attribute.size, this.gl.FLOAT, false, 0, 0);
        }
        this.gl.drawArrays(drawcall.mode, 0, drawcall.num_vertices);
        // display list
        if (this.current_displist_name)
            this.displists[this.current_displist_name].drawcalls.push(drawcall);
        else
            for (var i = 0; i < drawcall.buffers.length; ++i) {
                this.gl.deleteBuffer(drawcall.buffers[i]);
            }
    }

 
    enable(flag: string) {
        this.flags[flag] = true;
    }

    disable(flag: string) {
        this.flags[flag] = false;
    }

    get legacygl() {
        return this;
    }
}

// function get_legacygl(gl: WebGLRenderingContext, vertex_shader_src: string, fragment_shader_src: string) {
//     let legacygl = {};
    
//     let shader = {};
//     // vertex shader
//     const vertex_shader = gl.createShader(gl.VERTEX_SHADER)!;
//     gl.shaderSource(vertex_shader, vertex_shader_src);
//     gl.compileShader(vertex_shader);
//     if (!gl.getShaderParameter(vertex_shader, gl.COMPILE_STATUS))
//         throw new Error(gl.getShaderInfoLog(vertex_shader)??'');

//     // fragment shader
//     const fragment_shader = gl.createShader(gl.FRAGMENT_SHADER)!;
//     gl.shaderSource(fragment_shader, fragment_shader_src);
//     gl.compileShader(fragment_shader);
//     if (!gl.getShaderParameter(fragment_shader, gl.COMPILE_STATUS))
//         throw new Error(gl.getShaderInfoLog(fragment_shader)??'');

//     // shader program
//     const program = gl.createProgram()!;
//     gl.attachShader(program, vertex_shader);
//     gl.attachShader(program, fragment_shader);
//     gl.linkProgram(program);
//     gl.useProgram(program);
//     if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
//         throw new Error('Could not initialize shaders!');
//     }

//     legacygl.shader = { vertex_shader, fragment_shader, program };
    
//     // utility for uniforms
//     legacygl.uniforms = {};
//     legacygl.add_uniform = function(name: string, type) {
//         var uniform = {
//             location: gl.getUniformLocation(this.shader.program, `u_${name}`),
//             type: type,
//             is_array: false
//         };
//         uniform.value =
//             type == "1f" || type == "1i" ? 0 :
//             type == "2f" || type == "2i" ? vec2.create() :
//             type == "3f" || type == "3i" ? vec3.create() :
//             type == "4f" || type == "4i" ? vec4.create() :
//             type == "Matrix2f" ? mat2.create() :
//             type == "Matrix3f" ? mat3.create() :
//             type == "Matrix4f" ? mat4.create() :
//             undefined;
//         uniform.stack = [];
//         uniform.push = function(){
//             var copy =
//                 type == "1f" || type == "1i" ? this.value :
//                 type == "2f" || type == "2i" ? vec2.copy([], this.value) :
//                 type == "3f" || type == "3i" ? vec3.copy([], this.value) :
//                 type == "4f" || type == "4i" ? vec4.copy([], this.value) :
//                 type == "Matrix2f" ? mat2.copy([], this.value) :
//                 type == "Matrix3f" ? mat3.copy([], this.value) :
//                 type == "Matrix4f" ? mat4.copy([], this.value) :
//                 undefined;
//             this.stack.push(copy);
//         };
//         uniform.pop = function(){
//             var copy = this.stack[this.stack.length - 1];
//             this.value =
//                 type == "1f" || type == "1i" ? copy :
//                 type == "2f" || type == "2i" ? vec2.copy([], copy) :
//                 type == "3f" || type == "3i" ? vec3.copy([], copy) :
//                 type == "4f" || type == "4i" ? vec4.copy([], copy) :
//                 type == "Matrix2f" ? mat2.copy([], copy) :
//                 type == "Matrix3f" ? mat3.copy([], copy) :
//                 type == "Matrix4f" ? mat4.copy([], copy) :
//                 undefined;
//             this.stack.pop();
//         };
//         this.uniforms[name] = uniform;
//     };
//     legacygl.add_uniform_array = function(name, type, size) {
//         var uniform = {
//             location: gl.getUniformLocation(this.shader.program, "u_" + name),
//             type: type,
//             is_array: true
//         };
//         function make_default_value() {
//             var default_value =
//                 type == "1f" || type == "1i" ? 0 :
//                 type == "2f" || type == "2i" ? vec2.create() :
//                 type == "3f" || type == "3i" ? vec3.create() :
//                 type == "4f" || type == "4i" ? vec4.create() :
//                 type == "Matrix2f" ? mat2.create() :
//                 type == "Matrix3f" ? mat3.create() :
//                 type == "Matrix4f" ? mat4.create() :
//                 undefined;
//             return default_value;
//         };
//         uniform.value = [];
//         for (var i = 0; i < size; ++i)
//             uniform.value.push(make_default_value());
//         // stack push/pop unsupported for now
//         this.uniforms[name] = uniform;
//     };
//     legacygl.set_uniforms = function() {
//         for (var name in this.uniforms) {
//             var uniform = this.uniforms[name];
//             var type = uniform.type;
//             // in case of array type, flatten values
//             var passed_value;
//             if (uniform.is_array) {
//                 passed_value = [];
//                 for (var i = 0; i < uniform.value.length; ++i) {
//                     var v = uniform.value[i];
//                     for (var j = 0; j < v.length; ++j)
//                         passed_value.push(v[j]);
//                 }
//             } else {
//                 passed_value = uniform.value;
//             }
//             // call appropriate WebGL function depending on data type
//             var func_name = "uniform" + type;
//             if (uniform.is_array || type != "1f" && type != "1i")
//                 func_name += "v";
//             if (type == "Matrix2f" || type == "Matrix3f" || type == "Matrix4f") {
//                 gl[func_name](uniform.location, false, passed_value);
//             } else
//                 gl[func_name](uniform.location, passed_value);
//         }
//     };
    
//     // utility for vertex attributes
//     legacygl.vertex_attributes = [];
//     legacygl.add_vertex_attribute = function(name, size) {
//         var vertex_attribute = { name: name, size: size };
//         // initialize current value with 0
//         vertex_attribute.current = [];
//         for (var i = 0; i < size; ++i)
//             vertex_attribute.current.push(0);
//         // register current value setter func
//         this[name] = function() {
//             for (var i = 0; i < size; ++i)
//                 vertex_attribute.current[i] = arguments[i];
//         };
//         // shader location
//         vertex_attribute.location = gl.getAttribLocation(this.shader.program, "a_" + name);
//         gl.enableVertexAttribArray(vertex_attribute.location);
//         // add to the list
//         this.vertex_attributes.push(vertex_attribute);
//     };
//     // special treatment for vertex position attribute
//     legacygl.add_vertex_attribute("vertex", 3);
//     delete legacygl.vertex_attributes[0].current;
//     function vertex(x, y, z) {
//         for (var i = 0; i < this.vertex_attributes.length; ++i) {
//             var vertex_attribute = this.vertex_attributes[i];
//             var value = vertex_attribute.name == "vertex" ? [x, y, z] : vertex_attribute.current;
//             for (var j = 0; j < vertex_attribute.size; ++j)
//                 vertex_attribute.array.push(value[j]);
//         }
//         // emulate GL_QUADS
//         var num_vertices = this.vertex_attributes[0].array.length / 3;
//         if (this.mode == this.QUADS && num_vertices % 6 == 4) {         // 6 vertices per quad (= 2 triangles)
//             var v0 = num_vertices - 4;
//             // add 2 vertices identical to [v0] and [v0+2] to construct the other half of the quad
//             for (var k = 0; k < 3; ++k) {
//                 if (k == 1)
//                     continue;
//                 for (var i = 0; i < this.vertex_attributes.length; ++i) {
//                     var vertex_attribute = this.vertex_attributes[i];
//                     for (var j = 0; j < vertex_attribute.size; ++j)
//                         vertex_attribute.array.push(vertex_attribute.array[vertex_attribute.size * (v0 + k) + j]);
//                 }
//             }
//         }
//     };
//     legacygl.vertex = vertex;
//     // begin and end
//     legacygl.begin = function(mode) {
//         this.set_uniforms();
//         this.mode = mode;
//         for (var i = 0; i < this.vertex_attributes.length; ++i) {
//             this.vertex_attributes[i].array = [];
//         }
//     };
//     legacygl.end = function() {
//         var drawcall = {
//             buffers      : [],
//             mode         : this.mode == this.QUADS ? gl.TRIANGLES : this.mode,
//             num_vertices : this.vertex_attributes[0].array.length / 3,
//         };
//         for (var k = 0; k < this.vertex_attributes.length; ++k) {
//             var vertex_attribute = this.vertex_attributes[k];
//             var buffer = gl.createBuffer();
//             gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
//             drawcall.buffers.push(buffer);
//             // simulate GL_AUTO_NORMAL
//             if (drawcall.mode == gl.TRIANGLES && vertex_attribute.name == "normal" && legacygl.flags.AUTO_NORMAL) {
//                 for (var i = 0; i < drawcall.num_vertices / 3; ++i) {
//                     var v = [];
//                     for (var j = 0; j < 3; ++j) {
//                         var slicepos = 3 * (3 * i + j);
//                         v.push(legacygl.vertex_attributes[0].array.slice(slicepos, slicepos + 3));
//                     }
//                     vec3.sub_ip(v[1], v[0]);
//                     vec3.sub_ip(v[2], v[0]);
//                     var n = vec3.cross([], v[1], v[2]);
//                     vec3.normalize_ip(n);
//                     for (var j = 0; j < 3; ++j)
//                         vertex_attribute.array.splice(3 * (3 * i + j), 3, n[0], n[1], n[2]);
//                 }
//             }
//             gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertex_attribute.array), gl.STATIC_DRAW);
//             gl.vertexAttribPointer(vertex_attribute.location, vertex_attribute.size, gl.FLOAT, false, 0, 0);
//         }
//         gl.drawArrays(drawcall.mode, 0, drawcall.num_vertices);
//         // display list
//         if (this.current_displist_name)
//             this.displists[this.current_displist_name].drawcalls.push(drawcall);
//         else
//             for (var i = 0; i < drawcall.buffers.length; ++i) {
//                 gl.deleteBuffer(drawcall.buffers[i]);
//             }
//     };
//     // emulate GL_QUADS
//     legacygl.QUADS = "QUADS";
//     // display list
//     legacygl.displists = {};
//     legacygl.current_displist_name = null;
//     legacygl.newList = function(name) {
//         var displist = this.displists[name];
//         if (displist) {
//             // delete existing buffers
//             for (var i = 0; i < displist.drawcalls.length; ++i) {
//                 var drawcall = displist.drawcalls[i];
//                 for (var j = 0; j < drawcall.buffers.length; ++j) {
//                     gl.deleteBuffer(drawcall.buffers[j]);
//                 }
//             }
//             displist.drawcalls = [];
//         } else {
//             this.displists[name] = displist = {
//                 name : name,
//                 drawcalls : []  // { buffers, mode, num_vertices }
//             };
//         }
//         this.current_displist_name = name;
//     };
//     legacygl.endList = function() {
//         this.current_displist_name = null;
//     };
//     legacygl.callList = function(name) {
//         var displist = this.displists[name];
//         if (!displist)
//             return;
//         this.set_uniforms();
//         for (var k = 0; k < displist.drawcalls.length; ++k) {
//             var drawcall = displist.drawcalls[k];
//             for (var i = 0; i < this.vertex_attributes.length; ++i) {
//                 var vertex_attribute = this.vertex_attributes[i];
//                 gl.bindBuffer(gl.ARRAY_BUFFER, drawcall.buffers[i]);
//                 gl.vertexAttribPointer(vertex_attribute.location, vertex_attribute.size, gl.FLOAT, false, 0, 0);
//             }
//             gl.drawArrays(drawcall.mode, 0, drawcall.num_vertices);
//         }
//     };
//     // wrapper
//     legacygl.displist_wrapper = function(name) {
//         var wrapper = {};
//         wrapper.is_valid = false;
//         wrapper.draw = function(drawfunc) {
//             if (!this.is_valid) {
//                 legacygl.newList(name);
//                 drawfunc();
//                 legacygl.endList();
//                 this.is_valid = true;
//             } else {
//                 legacygl.callList(name);
//             }
//         };
//         wrapper.invalidate = function() {
//             this.is_valid = false;
//         };
//         return wrapper;
//     };
//     // emulate GL_AUTO_NORMAL
//     legacygl.AUTO_NORMAL = "AUTO_NORMAL";
//     legacygl.flags = {
//         AUTO_NORMAL: false
//     };
//     legacygl.enable = function(flag) {
//         this.flags[flag] = true;
//     };
//     legacygl.disable = function(flag) {
//         this.flags[flag] = false;
//     };
//     return legacygl;
// };
