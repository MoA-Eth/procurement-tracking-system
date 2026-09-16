import ExcelJS from 'exceljs';

import { describe, expect, it } from 'vitest';
import { excelService } from './excel.service.js';

describe('ExcelService Import Helpers', () => {
  it('correctly extracts string from string and object cells', () => {
    const stringCell = { value: 'Test Contract' } as unknown as ExcelJS.Cell;
    const objectCell = {
      value: { result: 'Formula Result' },
    } as unknown as ExcelJS.Cell;
    const richTextCell = {
      value: { richText: [{ text: 'Rich ' }, { text: 'Text' }] },
    } as unknown as ExcelJS.Cell;
    const emptyCell = { value: null } as unknown as ExcelJS.Cell;

    expect(excelService.getCellString(stringCell)).toBe('Test Contract');
    expect(excelService.getCellString(objectCell)).toBe('Formula Result');
    expect(excelService.getCellString(richTextCell)).toBe('Rich Text');
    expect(excelService.getCellString(emptyCell)).toBe('');
  });

  it('correctly extracts numbers from numeric and formatted cells', () => {
    const numCell = { value: 1500.5 } as unknown as ExcelJS.Cell;
    const formulaCell = {
      value: { result: '25000.75' },
    } as unknown as ExcelJS.Cell;
    const formattedCell = { value: 'ETB 1,234.50' } as unknown as ExcelJS.Cell;
    const emptyCell = { value: null } as unknown as ExcelJS.Cell;

    expect(excelService.getCellNumber(numCell)).toBe(1500.5);
    expect(excelService.getCellNumber(formulaCell)).toBe(25000.75);
    expect(excelService.getCellNumber(formattedCell)).toBe(1234.5);
    expect(excelService.getCellNumber(emptyCell)).toBe(0);
  });

  it('correctly parses dates from Date objects, strings, and Excel serial numbers', () => {
    const d = new Date('2026-05-15');
    const dateCell = d;
    const stringCell = '2026-05-15';
    const excelSerial = 45792; // Approx date serial

    expect(
      excelService.parseCellDate(dateCell)?.toISOString().slice(0, 10),
    ).toBe('2026-05-15');
    expect(
      excelService.parseCellDate(stringCell)?.toISOString().slice(0, 10),
    ).toBe('2026-05-15');
    expect(excelService.parseCellDate(excelSerial)).toBeInstanceOf(Date);
    expect(excelService.parseCellDate(null)).toBeNull();
  });
  it('correctly normalizes headers by removing qualifiers, spaces, and case', () => {
    expect(excelService.normalizeHeader('Project Code (Required)')).toBe(
      'projectcode',
    );
    expect(excelService.normalizeHeader('Category (Dropdown)')).toBe(
      'category',
    );
    expect(excelService.normalizeHeader('Contract Number')).toBe(
      'contractnumber',
    );
  });

  it('validates template headers successfully when required columns match', () => {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Test');
    sheet.getRow(1).values = [
      'Project',
      'Activity',
      'Supplier',
      'Region',
      'Contract Number',
      'Contract Award Date',
      'Contract Signature Date',
      'Start Date',
      'End Date',
      'Original Contract Amount',
      'Amendment',
      'Final Contract Amount',
      'Total Paid',
      'Remaining Balance',
      'Contract Status',
    ];

    const result = excelService.validateTemplateHeaders(
      sheet,
      ['Project', 'Activity', 'Supplier', 'Contract Number', 'Contract Status'],
      'Contracts',
    );
    expect(result.valid).toBe(true);
  });

  it('rejects spreadsheet when required template headers are missing', () => {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('WrongTemplate');
    sheet.getRow(1).values = ['Random Col 1', 'Random Col 2'];

    expect(() => {
      excelService.validateTemplateHeaders(
        sheet,
        ['Project Code', 'Plan Title', 'Budget Year'],
        'Procurement Plans',
      );
    }).toThrow(/Invalid template structure for Procurement Plans/);
  });

  it('rejects spreadsheet when sheet has no headers', () => {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Empty');

    expect(() => {
      excelService.validateTemplateHeaders(sheet, ['Plan Title'], 'Plans');
    }).toThrow(/The file is empty or missing a header row/);
  });

  it('validates project template headers successfully when canonical columns match', () => {
    const wb = new ExcelJS.Workbook();
    const sheet = wb.addWorksheet('Projects Upload');
    sheet.getRow(1).values = [
      'Project Code (Required)',
      'Project Name (Required)',
      'SAP Identification No',
      'Country',
      'Executing Agency',
      'Organization',
      'Funding Source ID (Dropdown)',
      'Funding Type',
      'Sector ID (Dropdown)',
      'Status (Dropdown)',
    ];

    const result = excelService.validateTemplateHeaders(
      sheet,
      [
        'Project Code',
        'Project Name',
        'Funding Source ID',
        'Sector ID',
        'Status',
      ],
      'Projects',
    );
    expect(result.valid).toBe(true);
  });
});
