// Central list of tools: powers the homepage search and the tools directory.
// Each tool has search keywords beyond its name/description so natural
// phrases ("make an image smaller") still find the right tool.

const QT_TOOLS = [
  {
    id: "compress-image",
    name: "Compress Image",
    desc: "Shrink a photo's file size without losing much quality.",
    href: "tools/compress-image.html",
    category: "image",
    icon: "compress",
    keywords: "reduce file size make image smaller shrink photo optimise optimize jpg png webp"
  },
  {
    id: "resize-image",
    name: "Resize Image",
    desc: "Change an image's width and height in pixels.",
    href: "tools/resize-image.html",
    category: "image",
    icon: "resize",
    keywords: "scale image dimensions width height pixels crop change size"
  },
  {
    id: "image-to-pdf",
    name: "Image to PDF",
    desc: "Combine one or more photos into a single PDF file.",
    href: "tools/image-to-pdf.html",
    category: "pdf",
    icon: "img2pdf",
    keywords: "combine photos into one pdf convert picture to pdf jpg to pdf photos document"
  },
  {
    id: "merge-pdf",
    name: "Merge PDF",
    desc: "Join multiple PDF files into one, in the order you choose.",
    href: "tools/merge-pdf.html",
    category: "pdf",
    icon: "merge",
    keywords: "combine pdf files join pdfs stitch documents together"
  },
  {
    id: "qr-generator",
    name: "QR Code Generator",
    desc: "Turn a link, message, or UPI payment into a scannable code.",
    href: "tools/qr-generator.html",
    category: "other",
    icon: "qr",
    keywords: "create a qr code make qr scan link text upi payment code generator"
  }
];

const QT_CATEGORY_LABEL = {
  image: "Image Tools",
  pdf: "PDF Tools",
  other: "Other Tools"
};
