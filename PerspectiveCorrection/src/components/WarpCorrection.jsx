import { useState, useRef, useEffect } from "react";
import { useOpenCv } from "opencv-react";
import "./WarpCorrection.css";

function WarpCorrection(props){
    const { loaded, cv } = useOpenCv();
    const [warpedImageSrc, setWarpedImageSrc] = useState(null);
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
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
            };
        }
    }, [props.imageSrc, loaded]);

    function drawPoint(ctx, x, y){
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.arc(x, y, 20, 0, Math.PI * 2);
        ctx.fill();
    }

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

    function sortPoints(points){
        // Sorts the 4 points by comparing their relative values
        // For example the topLeft must be the one with the lowest x+y, bottomRight the highest, etc

        let topLeft = points.reduce(function(prev, curr){
            return prev.x + prev.y < curr.x + curr.y ? prev : curr;
        })
        let topRight = points.reduce(function(prev, curr){
            return prev.x - prev.y > curr.x - curr.y ? prev : curr
        })

        let bottomRight = points.reduce(function(prev, curr){
            return prev.x + prev.y > curr.x + curr.y ? prev : curr;
        })
        let bottomLeft = points.reduce(function(prev, curr){
            return prev.y - prev.x > curr.y - curr.x ? prev : curr
        })
    
        return [topLeft, topRight, bottomRight, bottomLeft];
    }
  
    const warpImage = (points) => {
        const img = imgRef.current;
        const mat = cv.imread(img);
        
        const srcPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
            points[0].x, points[0].y,  
            points[1].x, points[1].y,  
            points[2].x, points[2].y, 
            points[3].x, points[3].y,
        ]);

        const dstPts = cv.matFromArray(4, 1, cv.CV_32FC2, [
            0, 0, 
            destinationSize, 0, 
            destinationSize, destinationSize, 
            0, destinationSize, 
        ]);

        const homography = cv.getPerspectiveTransform(srcPts, dstPts);
        const dst = new cv.Mat();

        cv.warpPerspective(mat, dst, homography, new cv.Size(destinationSize, destinationSize));

        const canvas = document.createElement("canvas");
        canvas.width = dst.cols;
        canvas.height = dst.rows;
        cv.imshow(canvas, dst);
        const dataUrl = canvas.toDataURL("image/png");
        setWarpedImageSrc(dataUrl);

        
        mat.delete();
        dst.delete();
        srcPts.delete();
        dstPts.delete();
        homography.delete();
    };

    function downloadImage(){
        const link = document.createElement("a");
        link.href = warpedImageSrc; 
        link.setAttribute("download", "warpedPerspective.png")
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link); 
    };
    

    return (
        <div className="warp-container">
            {!loaded && <p>Loading OpenCV...</p>}

            {warpedImageSrc ? (
                <div id="image-display">
                     <img className="warped-image" src={warpedImageSrc} alt="Warped" />

                     <div className="buttons">
                        <h3 onClick={() => downloadImage()}className="button-30">Download Image as JPG</h3>
                        <h3 onClick={() => props.setImageSrc(null)} className="button-30">Warp Another Image</h3>
                    </div>
                </div>
               
            ) : (
                <p>Click on 4 points to define the warp region.</p>
            )}

            {!warpedImageSrc && <div>
                <canvas
                    className="click-canvas"
                    ref={canvasRef}
                    onClick={handleClick}
                />
            </div>}

           
        </div>
    );
};

export default WarpCorrection;
