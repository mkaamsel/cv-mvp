import {
  AlignmentType,
  BorderStyle,
  HeadingLevel,
  Paragraph,
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