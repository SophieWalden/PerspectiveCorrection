import React, { useState } from "react";
import { useDropzone } from "react-dropzone";
import heic2any from "heic2any";
import "./ImageUpload.css";
import { AnimatedBorder } from "react-animated-border";

function ImageUpload(props) {
  const [loading, setLoading] = useState(false); // Track loading state

  const onDrop = async (acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setLoading(true); 

      // Handle HEIC Images (A majority of Dr.Nelsons photos are HEIC, common with apple phones)
      if (file.type === "image/heic" || file.type === "image/heif") {
        try {
          const convertedBlob = await heic2any({
            blob: file,
            toType: "image/jpeg",
            quality: 0.8,
          });

          const reader = new FileReader();
          reader.onload = () => {
            props.onImageUpload(reader.result);
            setLoading(false);
          };
          reader.readAsDataURL(convertedBlob);
        } catch (error) {
          console.error("Error converting HEIC to JPEG:", error);
          setLoading(false)
        }
      } else {
        // Handle non-HEIC images
        const reader = new FileReader();
        reader.onload = () => {
          props.onImageUpload(reader.result);
          setLoading(false); 
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: "image/heic, image/heif, image/png, image/jpeg",
    maxSize: 5 * 1024 * 1024,
  });

  return (
    <div>
      {loading ? (
        <AnimatedBorder
          color="gray"
          style={{ padding: "10px" }}
          speed={1}
          width={3}
          direction="clockwise"
          className="loading-border"
        >
          <div className="image-input" {...getRootProps()}>
            Loading...
          </div>
        </AnimatedBorder>
      ) : (
      
        <div className="image-input marching-border" {...getRootProps()}>
        <input {...getInputProps()} />
        Drag and drop an image here, or click to select one.
        </div>

      )}
    </div>
  );
}

export default ImageUpload;
