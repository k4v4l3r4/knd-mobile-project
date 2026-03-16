import { format, formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';

/**
 * Format date to human-readable format
 * Examples:
 * - "16 Maret 2026, 23:38 WIB"
 * - "2 menit yang lalu"
 */

export const formatDate = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    // Handle different date formats from backend
    const safeDate = dateString.replace(' ', 'T');
    const date = new Date(safeDate);
    
    if (isNaN(date.getTime())) return '';
    
    // Format: 16 Maret 2026
    return format(date, 'd MMMM yyyy', { locale: id });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '';
  }
};

export const formatDateTime = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const safeDate = dateString.replace(' ', 'T');
    const date = new Date(safeDate);
    
    if (isNaN(date.getTime())) return '';
    
    // Format: 16 Maret 2026, 23:38
    return format(date, 'd MMMM yyyy, HH:mm', { locale: id });
  } catch (error) {
    console.error('Error formatting date time:', error);
    return '';
  }
};

export const formatDateTimeWithWib = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const safeDate = dateString.replace(' ', 'T');
    const date = new Date(safeDate);
    
    if (isNaN(date.getTime())) return '';
    
    // Format: 16 Maret 2026, 23:38 WIB
    return format(date, 'd MMMM yyyy, HH:mm [WIB]', { locale: id });
  } catch (error) {
    console.error('Error formatting date time with WIB:', error);
    return '';
  }
};

export const formatRelativeTime = (dateString: string): string => {
  if (!dateString) return '';
  
  try {
    const safeDate = dateString.replace(' ', 'T');
    const date = new Date(safeDate);
    
    if (isNaN(date.getTime())) return '';
    
    // Format: 2 menit yang lalu, 1 jam yang lalu, etc.
    return formatDistanceToNow(date, { 
      addSuffix: true, 
      locale: id 
    });
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return '';
  }
};

export const formatDateTimeFlexible = (
  dateString: string, 
  options: { 
    showRelative?: boolean; 
    showTime?: boolean;
    showWib?: boolean;
  } = {}
): string => {
  const { showRelative = false, showTime = true, showWib = false } = options;
  
  if (!dateString) return '';
  
  try {
    const safeDate = dateString.replace(' ', 'T');
    const date = new Date(safeDate);
    
    if (isNaN(date.getTime())) return '';
    
    // If showRelative, use relative time format
    if (showRelative) {
      return formatRelativeTime(dateString);
    }
    
    // If showWib, include WIB suffix
    if (showWib) {
      return formatDateTimeWithWib(dateString);
    }
    
    // If showTime is false, only show date
    if (!showTime) {
      return formatDate(dateString);
    }
    
    // Default: show date and time
    return formatDateTime(dateString);
  } catch (error) {
    console.error('Error formatting date time flexible:', error);
    return '';
  }
};
