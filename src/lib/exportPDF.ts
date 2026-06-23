import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportElementToPDF(
  element: HTMLElement,
  filename = "report.pdf",
  title = "Cybercrime Analysis Report"
) {
  const canvas = await html2canvas(element, {
    scale: 2,
    backgroundColor: "#ffffff",
    useCORS: true,
  });
  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("p", "mm", "a4");
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const imgWidth = pageWidth - 20;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const addHeaderFooter = (pageNum: number) => {
    pdf.setFontSize(11);
    pdf.setTextColor(10, 31, 68);
    pdf.text(title, 10, 10);
    pdf.setFontSize(8);
    pdf.setTextColor(90, 100, 120);
    pdf.text(new Date().toLocaleString("en-IN"), pageWidth - 10, 10, { align: "right" });
    pdf.text(
      `Cybercrime Police Station Palakkad | Confidential  •  Page ${pageNum}`,
      pageWidth / 2,
      pageHeight - 6,
      { align: "center" }
    );
  };

  let heightLeft = imgHeight;
  let position = 15;
  let page = 1;
  addHeaderFooter(page);
  pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
  heightLeft -= pageHeight - position - 15;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight + 15;
    pdf.addPage();
    page += 1;
    addHeaderFooter(page);
    pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
    heightLeft -= pageHeight - 15;
  }

  pdf.save(filename);
}
