import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportElementToPDF(
  element: HTMLElement,
  filename = "report.pdf",
  title = "Cybercrime Analysis Report",
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
      { align: "center" },
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

export function exportDataToPDF(stats: any, rangeStr: string, filename = "report.pdf") {
  const pdf = new jsPDF("p", "mm", "a4");

  pdf.setFontSize(16);
  pdf.setTextColor(10, 31, 68);
  pdf.text("Cybercrime Intelligence Report", 14, 22);

  pdf.setFontSize(10);
  pdf.setTextColor(90, 100, 120);
  pdf.text(`Reporting Period: ${rangeStr}`, 14, 30);
  pdf.text(`Generated On: ${new Date().toLocaleString("en-IN")}`, 14, 36);

  pdf.setLineWidth(0.5);
  pdf.setDrawColor(220, 224, 237);
  pdf.line(14, 42, 196, 42);

  pdf.setFontSize(12);
  pdf.setTextColor(10, 31, 68);
  pdf.text("Executive Summary", 14, 54);

  pdf.setFontSize(10);
  pdf.setTextColor(50, 60, 80);
  pdf.text(`Total Registered Cases : ${stats.total}`, 14, 64);
  pdf.text(`Average Feedback Rating: ${stats.avgRating.toFixed(2)} / 5`, 14, 72);
  pdf.text(`Overall Satisfaction   : ${Math.round(stats.satisfaction)}%`, 14, 80);
  pdf.text(`Primary Crime Category : ${stats.topCat}`, 14, 88);
  pdf.text(`Primary Location       : ${stats.topLoc}`, 14, 96);

  pdf.setFontSize(12);
  pdf.setTextColor(10, 31, 68);
  pdf.text("Category Breakdown (Top 15)", 14, 114);

  pdf.setFontSize(10);
  pdf.setTextColor(50, 60, 80);
  let y = 124;
  stats.categories.slice(0, 15).forEach((c: any) => {
    pdf.text(`${c.name}`, 14, y);
    pdf.text(`${c.count} cases (${c.pct.toFixed(1)}%)`, 140, y);
    y += 8;
  });

  if (stats.locations && stats.locations.length > 0) {
    y += 10;
    if (y > 250) {
      pdf.addPage();
      y = 20;
    }
    pdf.setFontSize(12);
    pdf.setTextColor(10, 31, 68);
    pdf.text("Location Breakdown (Top 10)", 14, y);

    y += 10;
    pdf.setFontSize(10);
    pdf.setTextColor(50, 60, 80);
    stats.locations.slice(0, 10).forEach((l: any) => {
      pdf.text(`${l.name}`, 14, y);
      pdf.text(`${l.count} cases`, 140, y);
      y += 8;
    });
  }

  const pageCount = (pdf as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 160);
    pdf.text(`Cybercrime Police Station Palakkad | Confidential  •  Page ${i}`, 105, 285, {
      align: "center",
    });
  }

  pdf.save(filename);
}
