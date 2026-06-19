from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
import base64
import cv2
import numpy as np
from PIL import Image
import io

app = FastAPI(title="Intelligent OCR AI Engine")

# เปิดให้ฝั่ง Next.js ยิง API ข้ามพอร์ตมาหา Python ได้โดยไม่ติดปัญหา CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# โครงสร้าง Data Type รองรับพิกัดจากหน้าบ้าน
class ROIModel(BaseModel):
    fieldName: str
    x: float
    y: float
    width: float
    height: float

class DocumentPayload(BaseModel):
    image: str  
    rois: List[ROIModel]

@app.get("/")
def read_root():
    return {"status": "AI Engine Online", "framework": "FastAPI"}

@app.post("/api/ai/process")
async def process_document(payload: DocumentPayload):
    try:
        # 1. แปลงภาพจาก Base64 กลับมาเป็น Array ของ OpenCV (Image Decoding)
        header, encoded = payload.image.split(",", 1) if "," in payload.image else ("", payload.image)
        image_data = base64.b64decode(encoded)
        image = Image.open(io.BytesIO(image_data))
        opencv_img = cv2.cvtColor(np.array(image), cv2.COLOR_RGB2BGR)
        
        results = []
        
        # 2. ลูปตัดส่วนของภาพ (Crop ROI) ตามค่า X, Y, W, H จริงที่ส่งมา
        for roi in payload.rois:
            x, y, w, h = int(roi.x), int(roi.y), int(roi.width), int(roi.height)
            
            # ครอปรูปเฉพาะพิกัดกล่อง
            crop_img = opencv_img[y:y+h, x:x+w]
            
            if crop_img.size == 0:
                continue
                
            # --- บล็อก Image Preprocessing ---
            # แปลงเป็นขาวดำ (Grayscale)
            gray = cv2.cvtColor(crop_img, cv2.COLOR_BGR2GRAY)
            # ทำ Binarization ลด Noise ของพื้นหลังกระดาษด้วย Otsu's Thresholding
            _, binarized = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            
            # [จุดนี้ในอนาคต]: นำภาพ binarized ส่งให้ EasyOCR / PaddleOCR สแกนคำจริง
            mocked_text = f"Value of {roi.fieldName}"
            
            results.append({
                "fieldName": roi.fieldName,
                "text": mocked_text,
                "confidence": 0.98
            })
            
        return {
            "success": True,
            "matched_template": "Thai_Railway_Ticket_V1",
            "extracted_data": results
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))