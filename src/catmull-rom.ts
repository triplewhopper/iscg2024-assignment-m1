import { vec3 } from 'gl-matrix';
/**
 * Compute the Catmull-Rom spline for the given control points.
 * @param ps 
 * @param knotParametrization 
 * @returns 
 */
export function cubicCatmullRomSpline(ps: readonly vec3[], knotParametrization: { uniform: boolean, chordal: boolean, centripetal: boolean }) {
    if (ps.length < 4) {
        throw new Error('At least 4 control points are required');
    }
    const uniformResult = [];
    if (knotParametrization.uniform) {
        uniformResult.push(...catmullRomImpl(ps, 0, 0));
    }
    const chordalResult = [];
    if (knotParametrization.chordal) {
        chordalResult.push(...catmullRomImpl(ps, 1, 0));
    }
    const centripetalResult = [];
    if (knotParametrization.centripetal) {
        centripetalResult.push(...catmullRomImpl(ps, 0.5, 0));
    }
    return { uniformResult, chordalResult, centripetalResult};
}

/**
 * Compute the Catmull-Rom spline for the given control points.
 * @example
 * catmullRomImpl(ps, 0, 0); // uniform
 * catmullRomImpl(ps, 1, 0); // chordal
 * catmullRomImpl(ps, 0.5, 0); // centripetal
 * @param ps control points
 * @param alpha between 0 and 1
 * @param tension between 0 and 1
 * @returns 
 * 
 */
function catmullRomImpl(ps: readonly vec3[], alpha: number, tension: number) {
    const result = [] as vec3[];
    for (let k = 0; k < ps.length - 3; k++) {
        const p0 = ps[k], p1 = ps[k + 1], p2 = ps[k + 2], p3 = ps[k + 3];

        const t01 = vec3.dist(p0, p1) ** alpha;
        const t12 = vec3.dist(p1, p2) ** alpha;
        const t23 = vec3.dist(p2, p3) ** alpha;
        const m1 = vec3.create(), m2 = vec3.create();

        m1[0] = (1 - tension) * (p2[0] - p1[0] + t12 * ((p1[0] - p0[0]) / t01 - (p2[0] - p0[0]) / (t01 + t12)));
        m1[1] = (1 - tension) * (p2[1] - p1[1] + t12 * ((p1[1] - p0[1]) / t01 - (p2[1] - p0[1]) / (t01 + t12)));
        m1[2] = (1 - tension) * (p2[2] - p1[2] + t12 * ((p1[2] - p0[2]) / t01 - (p2[2] - p0[2]) / (t01 + t12)));

        m2[0] = (1 - tension) * (p2[0] - p1[0] + t12 * ((p3[0] - p2[0]) / t23 - (p3[0] - p1[0]) / (t23 + t12)));
        m2[1] = (1 - tension) * (p2[1] - p1[1] + t12 * ((p3[1] - p2[1]) / t23 - (p3[1] - p1[1]) / (t23 + t12)));
        m2[2] = (1 - tension) * (p2[2] - p1[2] + t12 * ((p3[2] - p2[2]) / t23 - (p3[2] - p1[2]) / (t23 + t12)));

        const a = vec3.create(), b = vec3.create(), c = m1, d = p1;

        a[0] = 2 * (p1[0] - p2[0]) + m1[0] + m2[0];
        a[1] = 2 * (p1[1] - p2[1]) + m1[1] + m2[1];
        a[2] = 2 * (p1[2] - p2[2]) + m1[2] + m2[2];

        b[0] = -3 * (p1[0] - p2[0]) - 2 * m1[0] - m2[0];
        b[1] = -3 * (p1[1] - p2[1]) - 2 * m1[1] - m2[1];
        b[2] = -3 * (p1[2] - p2[2]) - 2 * m1[2] - m2[2];

        for (let i = 0; i <= 20; ++ i) {
            const t = i / 20;
            const x = ((a[0] * t + b[0]) * t + c[0]) * t + d[0];
            const y = ((a[1] * t + b[1]) * t + c[1]) * t + d[1];
            const z = ((a[2] * t + b[2]) * t + c[2]) * t + d[2];
            result.push(vec3.fromValues(x, y, z));
        }
    }
    return result;
}