import { useState, useRef, useEffect } from "react";
import { useOpenCv } from "opencv-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import "./WarpCorrection.css";

function WarpCorrection(props) {
    const { loaded, cv } = useOpenCv();
    const [warpedImageSrc, setWarpedImageSrc] = useState(null);
    const [grid, setGrid] = useState({ rows: 2, cols: 2 });
    const [gridImages, setGridImages] = useState([]);
    const [points, setPoints] = useState([]);
    const canvasRef = useRef(null);
    const imgRef = useRef(null);
    const destinationSize = 500;

    useEffect(() => {
        if (props.imageSrc && loaded) {
            const img = new Image();
            img.src = props.imageSrc;
            img.onload = () => {
                imgRef.current = img;
                const canvas = canvasRef.current;
                const ctx = canvas.getContext("2d");

                // Set canvas size based on the image size
                const aspectRatio = img.width / img.height;
                const canvasWidth = Math.min(700, img.width);
                const canvasHeight = canvasWidth / aspectRatio;
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;

                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            };
        }
    }, [props.imageSrc, loaded]);

    const drawPoint = (ctx, x, y) => {
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();
    };

    const handleClick = (e) => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        setPoints((prevPoints) => {
            const newPoints = [...prevPoints, { x, y }];
            if (newPoints.length === 4) {
                const sortedPoints = sortPoints(newPoints);
                warpImage(sortedPoints);
            }
            return newPoints;
        });

        drawPoint(ctx, x, y);
    };

    const sortPoints = (points) => {
        let topLeft = points.reduce((prev, curr) => prev.x + prev.y < curr.x + curr.y ? prev : curr);
        let topRight = points.reduce((prev, curr) => prev.x - prev.y > curr.x - curr.y ? prev : curr);
        let bottomRight = points.reduce((prev, curr) => prev.x + prev.y > curr.x + curr.y ? prev : curr);
        let bottomLeft = points.reduce((prev, curr) => prev.y - prev.x > curr.y - curr.x ? prev : curr);
        return [topLeft, topRight, bottomRight, bottomLeft];
    };

    const warpImage = async (points = null) => {
        const resolvedCv = await cv;
        const imgElement = imgRef.current;
        if (!imgElement) return;

        const mat = resolvedCv.imread(imgElement);

        // If no points are provided, warp the entire image
        if (!points) {
            points = [
                { x: 0, y: 0 },
                { x: mat.cols, y: 0 },
                { x: mat.cols, y: mat.rows },
                { x: 0, y: mat.rows }
            ];
        }

        const srcPts = resolvedCv.matFromArray(4, 1, resolvedCv.CV_32FC2, [
            points[0].x, points[0].y,
            points[1].x, points[1].y,
            points[2].x, points[2].y,
            points[3].x, points[3].y
        ]);
        const dstPts = resolvedCv.matFromArray(4, 1, resolvedCv.CV_32FC2, [
            0, 0,
            destinationSize, 0,
            destinationSize, destinationSize,
            0, destinationSize
        ]);
        const homography = resolvedCv.getPerspectiveTransform(srcPts, dstPts);
        const dst = new resolvedCv.Mat();

        resolvedCv.warpPerspective(mat, dst, homography, new resolvedCv.Size(destinationSize, destinationSize));

        const canvas = document.createElement("canvas");
        canvas.width = dst.cols;
        canvas.height = dst.rows;
        resolvedCv.imshow(canvas, dst);
        setWarpedImageSrc(canvas.toDataURL("image/png"));

        mat.delete();
        dst.delete();
        srcPts.delete();
        dstPts.delete();
        homography.delete();
    };

    const splitImage = async () => {
        const resolvedCv = await cv;
        const img = new Image();
        img.src = warpedImageSrc;
        img.onload = () => {
            const mat = resolvedCv.imread(img);
            const segmentWidth = Math.floor(mat.cols / grid.cols);
            const segmentHeight = Math.floor(mat.rows / grid.rows);

            const images = [];
            for (let row = 0; row < grid.rows; row++) {
                for (let col = 0; col < grid.cols; col++) {
                    const rect = new resolvedCv.Rect(col * segmentWidth, row * segmentHeight, segmentWidth, segmentHeight);
                    const segment = mat.roi(rect);
                    const canvas = document.createElement("canvas");
                    canvas.width = segmentWidth;
                    canvas.height = segmentHeight;
                    resolvedCv.imshow(canvas, segment);
                    images.push(canvas.toDataURL("image/png"));
                    segment.delete();
                }
            }

            mat.delete();
            setGridImages(images);
        };
    };

    useEffect(() => {
        if (gridImages.length > 0) {
            downloadImages();
        }
    }, [gridImages]);

    const downloadImages = () => {
        const zip = new JSZip();
        gridImages.forEach((dataUrl, index) => {
            const base64Data = dataUrl.split(",")[1];
            zip.file(`segment_${index + 1}.png`, base64Data, { base64: true });
        });
        zip.generateAsync({ type: "blob" }).then((blob) => {
            saveAs(blob, "grid_segments.zip");
        });
    };

    const handleRowChange = (increment) => {
        setGrid(prevState => ({
            ...prevState,
            rows: Math.max(1, prevState.rows + increment), // Ensure there's at least one row
        }));
    };

    const handleColumnChange = (increment) => {
        setGrid(prevState => ({
            ...prevState,
            cols: Math.max(1, prevState.cols + increment), // Ensure there's at least one column
        }));
    };

    return (
        <div className="warp-container">
            {!loaded && <p>Loading OpenCV...</p>}

            {warpedImageSrc ? (
                <div>
                    <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                        <div id="split-container">
                            <div id="row-selector">
                                <div className="selector button-30" onClick={() => handleRowChange(-1)}>{'<'}</div>
                                {grid.rows} Rows
                                <div className="selector button-30" onClick={() => handleRowChange(1)}>{'>'}</div>
                            </div>

                            <div id="left-content">
                                <div id="column-selector">
                                    <div className="selector button-30" onClick={() => handleColumnChange(1)}>{'^'}</div>
                                    {grid.cols} Columns
                                    <div className="selector button-30" onClick={() => handleColumnChange(-1)}>{'v'}</div>
                                </div>

                                <img className="warped-image" style={{ maxWidth: "70vw" }} src={warpedImageSrc} alt="Warped" />
                            </div>
                        </div>
                    </div>

                    <div className="buttons" style={{ marginTop: "20px" }}>
                        <button onClick={splitImage}>Split Warped Image</button>
                        <button onClick={() => location.reload()}>Choose Another Image</button>
                    </div>
                </div>
            ) : (
                <div id="godWhy">
                    <p>Click on 4 points to define the warp region.</p>
                    <canvas className="click-canvas" ref={canvasRef} onClick={handleClick} />
                    <button onClick={() => warpImage()}>Warp Whole Image</button> 
                </div>
            )}
        </div>
    );
}

export default WarpCorrection;
