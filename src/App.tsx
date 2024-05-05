import React from 'react';
import logo from './logo.svg';
import './App.css';
import { MathJax, MathJaxContext } from 'better-react-mathjax';
import { BezierCurveCanvas, BezierCurve2DConfig } from './bezier-canvas';
import { CubicCatmullRomSpline2DConfig, CubicCatmullRomCurveCanvas } from './catmull-rom-canvas';

type MyCanvasProps = {
    readonly config: Curve2DConfig,
    readonly canvasSize: readonly [number, number],
}

function MyCanvas({ config, canvasSize }: MyCanvasProps) {
    switch (config.tag) {
        case 'Bézier':
            return <BezierCurveCanvas config={config} canvasSize={canvasSize} />;
        case 'bspline':
            return <div>Not implemented</div>;
        case 'catmull-rom':
            return <CubicCatmullRomCurveCanvas config={config} canvasSize={canvasSize} />;
    }
}


type BSplineCurve2DConfig = {
    readonly tag: 'bspline',
    readonly showControlPoints: boolean,
    readonly showSamplePoints: boolean,
    readonly controlPoints: readonly [number, number, 0][],
    readonly degree: number,
    readonly nSteps: number,
};


type Curve2DConfig = BezierCurve2DConfig | BSplineCurve2DConfig | CubicCatmullRomSpline2DConfig;
type ReferenceProps = {
    readonly author: string,
    readonly title: string,
    readonly journal: string,
    readonly volume: string,
    readonly issue: string,
    readonly year: string,
    readonly pages: string,
    readonly doi: string,
    readonly url: string,
};

function Reference({ author, title, journal, volume, issue, year, pages, doi, url }: ReferenceProps) {
    return (<p>
        {author}, <i>{title}</i>, {journal}, Volume {volume}, Issue {issue}, {year}, Pages {pages}, <a href={doi}>DOI</a>, <a href={url}>URL</a>
    </p>);
}

const mathjaxConfig = {
    loader: { load: ["[tex]/html"] },
    tex: {
        packages: { "[+]": ["html"] },
        inlineMath: [
            ["$", "$"],
            ["\\(", "\\)"]
        ],
        displayMath: [
            ["$$", "$$"],
            ["\\[", "\\]"]
        ]
    }
};

function clip(x: number, min: number, max: number) {
    return Math.max(min, Math.min(max, x));
}

function App() {
    const [nSteps, setNSteps] = React.useState(100);
    const minNSteps = 2, maxNSteps = 20000;
    const [showControlPoints, setShowControlPoints] = React.useState(true);
    const [showSamplePoints, setShowSamplePoints] = React.useState(true);

    const [adaptiveSubdivision, setAdaptiveSubdivision] = React.useState(false);
    const [adaptiveNSteps, setAdaptiveNSteps] = React.useState<number | null>(null);

    const canvasSize = [640, 480] as const;
    const [controlPoints, setControlPoints] = React.useState<readonly [number, number, 0][]>([
        [0.0, 0.5, 0],
        [-0.5, -0.5, 0.0],
        [0.5, -0.5, 0.0],
    ]);

    const [catmullRomControlPoints, setCatmullRomControlPoints] = React.useState<CubicCatmullRomSpline2DConfig['controlPoints']>([
        [-0.5, 0.5, 0],
        [-0.25, -0.5, 0],
        [0.25, -0.5, 0],
        [0.5, 0.5, 0],
    ]);

    const [curveType, setCurveType] = React.useState<Curve2DConfig['tag']>('Bézier');
    const [knotParametrization, setKnotParametrization] = React.useState<CubicCatmullRomSpline2DConfig['knotParametrization']>({uniform: true, chordal: false, centripetal: false});
    const curve2DConfig = React.useMemo<Curve2DConfig>(() => {
        switch (curveType) {
            case 'Bézier':
                return {
                    ...{
                        tag: 'Bézier',
                        showControlPoints,
                        showSamplePoints,
                        controlPoints,
                        setControlPoints,
                    }, ...(adaptiveSubdivision ? {
                        adaptiveSubdivision, nSteps: adaptiveNSteps, setNSteps: setAdaptiveNSteps
                    } : {
                        adaptiveSubdivision, nSteps
                    })
                };
            case 'bspline':
                return {
                    tag: 'bspline',
                    showControlPoints,
                    showSamplePoints,
                    controlPoints,
                    degree: 3,
                    nSteps,
                };
            case 'catmull-rom':
                return {
                    tag: 'catmull-rom',
                    showControlPoints,
                    showSamplePoints,
                    controlPoints: catmullRomControlPoints,
                    setControlPoints: setCatmullRomControlPoints,
                    knotParametrization,
                }
       }
    }, [curveType, showControlPoints, showSamplePoints, 
        controlPoints, nSteps, adaptiveSubdivision, adaptiveNSteps,
        catmullRomControlPoints, knotParametrization]);

    return (
        <>
            <p>this is a canvas of size {canvasSize[0]}x{canvasSize[1]}</p>
            <MyCanvas config={curve2DConfig} canvasSize={canvasSize} />
            <div>
                <div>Press <span style={{ fontWeight: 'bold' }}>left</span> mouse button to drag a point</div>
                <div>Press <span style={{ fontWeight: 'bold' }}>right</span> mouse button to add a control point</div>
                {/* <div>Press <span style={{ fontWeight: 'bold' }}>right</span> mouse button on a control point to remove it</div> */}
                <div>Type of curves:{" "}
                    <select defaultValue={curveType} onChange={(e) => setCurveType(e.target.value as 'Bézier' | 'bspline')}>
                        <option value="Bézier">Bézier</option>
                        {/* <option value="bspline">B-Spline</option> */}
                        <option value="catmull-rom">Cubic Catmull-Rom Spline</option>
                    </select>
                </div>
                {curveType === 'Bézier' && (<>
                    <div>Number of order: <i>n=</i>{controlPoints.length}</div>
                    <div>Adaptive Subdivision <input type="checkbox" checked={adaptiveSubdivision} onChange={e => setAdaptiveSubdivision(e.target.checked)} /></div>
                    {!adaptiveSubdivision && <div>Number of steps: <input type="number" defaultValue={nSteps} min={minNSteps} max={maxNSteps} onChange={(e) => setNSteps(clip(Number(e.target.value), minNSteps, maxNSteps))} /></div>}
                    {adaptiveSubdivision && <div>Number of adaptive steps: {adaptiveNSteps ?? 'N/A'}</div>}
                    <div>Show control points: <input type="checkbox" checked={showControlPoints} onChange={(e) => setShowControlPoints(e.target.checked)} /></div>
                    <div>Show sample points: <input type="checkbox" checked={showSamplePoints} onChange={(e) => setShowSamplePoints(e.target.checked)}/></div>
                </>)}

                {curveType === 'catmull-rom' && (<>
                    <div>Uniform knot parametrization: <input type="checkbox" checked={knotParametrization.uniform} onChange={(e) => setKnotParametrization({...knotParametrization, uniform: e.target.checked})} /></div>
                    <div>Chordal knot parametrization: <input type="checkbox" checked={knotParametrization.chordal} onChange={(e) => setKnotParametrization({...knotParametrization, chordal: e.target.checked})} /></div>
                    <div>Centripetal knot parametrization: <input type="checkbox" checked={knotParametrization.centripetal} onChange={(e) => setKnotParametrization({...knotParametrization, centripetal: e.target.checked})} /></div>
                    <div>Show control points: <input type="checkbox" checked={showControlPoints} onChange={(e) => setShowControlPoints(e.target.checked)} /></div>
                    <div>Show sample points: <input type="checkbox" checked={showSamplePoints} onChange={(e) => setShowSamplePoints(e.target.checked)} /></div>
                </>)}
                
                <button onClick={() => {
                    const a = document.createElement('a');
                    a.href = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(curve2DConfig))}`;
                    a.download = 'config.json';
                    a.click();
                }}>Download Configuration</button>

                <button onClick={() => {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = '.json';
                    input.onchange = () => {
                        const file = input.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const content = e.target?.result as string;
                            const config = JSON.parse(content);
                                console.log(config);
                                if (config.tag === 'Bézier') {
                                setCurveType('Bézier');
                                setControlPoints(config.controlPoints);
                                setShowControlPoints(config.showControlPoints);
                                setShowSamplePoints(config.showSamplePoints);
                                setAdaptiveSubdivision(config.adaptiveSubdivision);
                                setAdaptiveNSteps(config.adaptiveNSteps);
                                setNSteps(config.nSteps);
                            } else if (config.tag === 'catmull-rom') {
                                setCurveType('catmull-rom');
                                setCatmullRomControlPoints(config.controlPoints);
                                setShowControlPoints(config.showControlPoints);
                                setShowSamplePoints(config.showSamplePoints);
                                setKnotParametrization(config.knotParametrization);
                            } else {
                                console.error(`Unsupported curve type: ${config.tag}`);
                            }
                        };
                        reader.readAsText(file);
                    };
                    input.click();
                }}>Upload Configuration</button>

            </div>
            <p> Implementation Details: </p>
            <MathJaxContext version={3} config={mathjaxConfig}>
            <ul>
                <li>
                    <p>Arbitrary order Bézier curve: <br />
                        The Bézier curve plotting is implemented in iterative De Casteljau's algorithm.
                        Suppose there are <MathJax inline>{"$n+1$"}</MathJax> control points <MathJax inline>{String.raw`$\boldsymbol{P}_0, \boldsymbol{P}_1, \ldots, \boldsymbol{P}_n$`}</MathJax>,
                        and sampling points <MathJax inline>{"$t_k = k/(m - 1)$"}</MathJax> for <MathJax inline>{"$k=0,1,\\ldots,m - 1$"}</MathJax>.
                        the curve is evaluated iteratively by the following formula:
                        <MathJax>{String.raw`
                        \begin{align*}
                        \boldsymbol{B}_{0, i}(t_k) &= \boldsymbol{P}_i \\
                        \boldsymbol{B}_{j+1, i}(t_k) &= t_k \boldsymbol{B}_{j, i}(t_k) + (1 - t_k) \boldsymbol{B}_{j, i+1}(t_k)
                        \end{align*}
                        `}</MathJax>
                        where <MathJax inline>{"$B_{j, i}(t_k)$"}</MathJax> is the <MathJax inline>{"$i$-th"}</MathJax> control point of the <MathJax inline>{"$j$-th"}</MathJax> iteration.
                        The algorithm is implemented in the <code>evaluateBezierCurve</code> function.
                    </p>
                </li>
                <li>
                    <p> Adaptive Subdivision: <br />
                        The adaptive subdivision algorithm is implemented based on the paper <i>Adaptive Subdivision of Bézier Curves</i> by Henrik Gravesen.
                        The algorithm recursively subdivides the curve until the difference between the estimated arc-length <MathJax inline>{"$L$"}</MathJax> and the chord length <MathJax inline>{"$L_c$"}</MathJax> is below a threshold (currently set to <MathJax inline>{"$10^{-5}$"}</MathJax> ). <br />
                        <MathJax inline>{"$L$"}</MathJax> is calculated by the following formula:
                        <MathJax>{"$$L = \\frac{2 L_c + (n-1)L_p}{n+1}$$"}</MathJax> 
                        where <MathJax inline>{"$n$"}</MathJax> is the number of control points, <MathJax inline>{"$L_p$"}</MathJax> is the polygon length, i.e. <MathJax inline>{"$\\sum_{i=0}^{n-1} |P_i - P_{i+1}|$"}</MathJax>, and <MathJax inline>{"$L_c$"}</MathJax> is the distance between the first and last control points. <br />
                        And 
                        <MathJax>{"$$L - L_c = \\frac{n-1}{n+1}(L_p - L_c)$$"}</MathJax>
                        The algorithm is implemented in the <code>GravesenSubdivision</code> function, 
                        which takes a list of control points and returns a list of sample points. The sample points are then used to draw the curve. 
                        For better performance, the algorithm is implemented in an iterative way using a stack.
                    </p>
                </li>
                <li>
                    <p> B-Spline Curves: <br />
                        The B-Spline curve is implemented in the <code>uniformBSpline</code> function.
                        The function takes a list of control points, a list of sampling points, and the degree of the curve.
                        The algorithm is based on the De Boor's algorithm, which is a generalization of the De Casteljau's algorithm.
                        The algorithm is implemented in an iterative way, where the control points are updated in each iteration.
                    </p>
                </li>
            </ul>
            </MathJaxContext>
            <p>References</p>
            <ol type='1'>
                <li>
                    <Reference
                        author="Jens Gravesen"
                        title="Adaptive subdivision and the length and energy of Bézier curves"
                        journal="Computational Geometry"
                        volume="8" issue="1" year="1997" pages="13-31"
                        doi="https://doi.org/10.1016/0925-7721(95)00054-2"
                        url="https://www.sciencedirect.com/science/article/pii/0925772195000542" />
                </li>
                <li>
                    <a href="https://comp.graphics.algorithms.narkive.com/w4co31vm/adaptive-subdivision-of-bezier-curves">
                        Discussion: Adaptive Subdivision of Bezier Curves
                    </a>
                </li>
                <li>
                    <a href="https://qroph.github.io/2018/07/30/smooth-paths-using-catmull-rom-splines.html">
                        Smooth paths using Catmull-Rom splines
                    </a>
                </li>
            </ol>
        </>
    );
}
export default App;
