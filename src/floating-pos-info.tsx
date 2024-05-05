import React from 'react';

export function FloatingPosInfo({ uv, xy }: { uv: [number, number] | null, xy: [number, number] | null }) {
    const [pos, setPos] = React.useState({ top: 0, left: 0, visible: true });
    React.useEffect(() => {
        if (uv) {
            const [u, v] = uv;
            setPos({ top: 5 + v, left: 5 + u, visible: true });
        } else {
            setPos({ top: 0, left: 0, visible: false });
        }
    }, [uv]);
    return (
        <div style={{
            position: 'absolute',
            fontFamily: 'consolas, monospace',
            top: pos.top,
            left: pos.left,
            padding: '5px',
            zIndex: 1,
            visibility: pos.visible ? 'visible' : 'hidden',
            backdropFilter: 'blur(5px)',
            backgroundColor: 'rgba(255, 255, 255, 0.5)',
            border: '1px solid black',
            borderRadius: '5px',
        }}>
            <div>
                (u={uv?.[0] ?? 'N/A'}, v={uv?.[1] ?? 'N/A'})
            </div>
            <div>
                (x={xy?.[0].toFixed(3) ?? 'N/A'}, y={xy?.[1].toFixed(3) ?? 'N/A'})
            </div>
        </div>
    );
}

