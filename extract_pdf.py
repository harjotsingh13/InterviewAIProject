import fitz # PyMuPDF
import sys

def extract_text(pdf_path):
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    
    with open("pdf_text.txt", "w", encoding="utf-8") as f:
        f.write(text)

if __name__ == "__main__":
    extract_text(sys.argv[1])
