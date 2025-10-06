import { readFile } from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { parseFlexibleDate, sortByDate, formatToIsoDate, formatToKoreanShortDate } from '../utils/date.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const DATA_PATH = join(__dirname, '../../data/performanceAssessments.json');

const normalizeRecord = (record) => {
  const date = parseFlexibleDate(record.date);
  if (!date) {
    return null;
  }

  const title = String(record.title ?? record.subject ?? '수행평가').trim();
  const subject = record.subject ? String(record.subject).trim() : '';
  const description = record.description ? String(record.description).trim() : '';

  return {
    title,
    subject,
    date: formatToIsoDate(date),
    displayDate: formatToKoreanShortDate(date),
    description,
  };
};

export const getPerformanceAssessments = async () => {
  const file = await readFile(DATA_PATH, 'utf8');
  const items = JSON.parse(file);

  if (!Array.isArray(items)) {
    throw new Error('수행평가 데이터가 올바른 배열 형식이 아닙니다.');
  }

  const normalized = items.map(normalizeRecord).filter(Boolean);
  return sortByDate(normalized, (item) => new Date(item.date));
};

