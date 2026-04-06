import {
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  Paragraph,
  TabStopPosition,
  TabStopType,
  TextRun,
} from "docx";

export function makeNameParagraph(name: string) {
  return new Paragraph({
    children: [
      new TextRun({
        text: name,
        bold: true,
        size: 28,
      }),
    ],
    spacing: {
      after: 120,
    },
  });
}

export function makeContactParagraph(lines: string[]) {
  return new Paragraph({
    children: [
      new TextRun({
        text: lines.filter(Boolean).join(" | "),
        size: 20,
      }),
    ],
    spacing: {
      after: 200,
    },
  });
}

export function makeSectionHeading(text: string) {
  return new Paragraph({
    text,
    heading: HeadingLevel.HEADING_2,
    spacing: {
      before: 160,
      after: 80,
    },
    border: {
      bottom: {
        color: "BFBFBF",
        size: 6,
        space: 1,
        style: BorderStyle.SINGLE,
      },
    },
  });
}

export function makeBullet(text: string) {
  return new Paragraph({
    text,
    bullet: {
      level: 0,
    },
    spacing: {
      after: 60,
    },
  });
}

/**
 * Role header paragraph: "Role Title  [tab→]  Date Range"
 * The second line (company + location) sits below, left-aligned.
 */
export function makeRoleHeaderParagraph(
  title: string,
  company?: string,
  location?: string,
  dateRange?: string,
): Paragraph[] {
  const paragraphs: Paragraph[] = [];

  // Line 1: bold role title left, date range right-aligned via tab stop
  const titleRun = new TextRun({ text: title, bold: true, size: 22 });
  const runs: TextRun[] = [titleRun];
  if (dateRange) {
    runs.push(new TextRun({ text: "\t", size: 22 }));
    runs.push(new TextRun({ text: dateRange, size: 20, color: "555555" }));
  }

  paragraphs.push(
    new Paragraph({
      children: runs,
      spacing: { before: 160, after: 40 },
      tabStops: [
        {
          type: TabStopType.RIGHT,
          position: TabStopPosition.MAX,
        },
      ],
    }),
  );

  // Line 2: company · location
  const subLine = [company, location].filter(Boolean).join(" · ");
  if (subLine) {
    paragraphs.push(
      new Paragraph({
        children: [new TextRun({ text: subLine, size: 20, color: "555555" })],
        spacing: { after: 60 },
      }),
    );
  }

  return paragraphs;
}

export function makeBodyParagraph(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    spacing: {
      after: 160,
      line: 300,
    },
    alignment: AlignmentType.JUSTIFIED,
  });
}

export function makeRightAlignedParagraph(text: string) {
  return new Paragraph({
    children: [new TextRun({ text, size: 22 })],
    spacing: {
      after: 160,
    },
    alignment: AlignmentType.RIGHT,
  });
}