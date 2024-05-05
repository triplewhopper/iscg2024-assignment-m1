import { vec3 } from 'gl-matrix';

function uniformBSpline(ps: readonly vec3[], ts: readonly number[]): vec3[] {
    if (ps.length < 2) {
        throw new Error('At least 2 control points are required');
    }
    const result = [];
    for (const t of ts) {
        let points = ps.map(vec3.clone);
        while (points.length > 1) {
            for (let i = 0; i < points.length - 1; i++) {
                vec3.lerp(points[i], points[i], points[i + 1], t);
            }
            points.pop();
        }
        result.push(points[0]);
    }
    return result;
}

function quadraticUniformBSpline(ps: readonly vec3[], ts: readonly number[]): vec3[] {
    if (ps.length < 3) {
        throw new Error('At least 3 control points are required');
    }
    const result = [];
    for (const t of ts) {
        let points = ps.map(vec3.clone);
        while (points.length > 2) {
            for (let i = 0; i < points.length - 2; i++) {
                vec3.lerp(points[i], points[i], points[i + 1], t);
            }
            points.pop();
        }
        result.push(points[1]);
    }
    return result;
}