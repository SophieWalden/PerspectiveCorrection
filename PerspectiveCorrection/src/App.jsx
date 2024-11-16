import { useState } from "react";
import ImageUpload from "./components/ImageUpload";
import WarpCorrection from "./components/WarpCorrection";
import "./App.css"

const App = () => {
    const [imageSrc, setImageSrc] = useState(null);

    return (
        <div className="cv-loader">

              {!imageSrc && <ImageUpload className="image-loader" onImageUpload={setImageSrc} />}
              {imageSrc && <WarpCorrection setImageSrc={setImageSrc} imageSrc={imageSrc} />}

        </div>
    );
};

export default App;
