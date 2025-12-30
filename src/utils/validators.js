const DropdownOption = require('../models/DropdownOption');

/**
 * Validate a dropdown option exists and is active
 * @param {string} id - The dropdown option ID
 * @param {string} type - The type of dropdown (project, transporter, loading_point, etc.)
 * @returns {Promise<{valid: boolean, option?: object, error?: string}>}
 */
const validateDropdownOption = async (id, type) => {
  if (!id) {
    return { valid: false, error: `${type} ID is required` };
  }

  const option = await DropdownOption.findOne({
    _id: id,
    type,
    isActive: true
  }).lean();

  if (!option) {
    const typeDisplay = type.replace('_', ' ');
    return { valid: false, error: `Invalid ${typeDisplay}` };
  }

  return { valid: true, option };
};

/**
 * Validate multiple dropdown options at once
 * @param {Array<{id: string, type: string}>} options - Array of options to validate
 * @returns {Promise<{valid: boolean, results?: object, error?: string}>}
 */
const validateMultipleDropdownOptions = async (options) => {
  const results = {};

  for (const { id, type, required = true } of options) {
    if (!id && !required) {
      results[type] = null;
      continue;
    }

    const validation = await validateDropdownOption(id, type);
    if (!validation.valid) {
      return { valid: false, error: validation.error };
    }
    results[type] = validation.option;
  }

  return { valid: true, results };
};

/**
 * Build pagination object for API responses
 * @param {number} total - Total count of items
 * @param {number} limit - Items per page
 * @param {number} skip - Items to skip
 * @param {number} currentCount - Number of items in current response
 * @returns {object} Pagination object
 */
const buildPagination = (total, limit, skip, currentCount) => {
  const parsedLimit = parseInt(limit, 10);
  const parsedSkip = parseInt(skip, 10);

  return {
    total,
    limit: parsedLimit,
    skip: parsedSkip,
    hasMore: parsedSkip + currentCount < total,
  };
};

/**
 * Parse pagination params from request query
 * @param {object} query - Request query object
 * @param {object} defaults - Default values
 * @returns {object} Parsed pagination params
 */
const parsePaginationParams = (query, defaults = { limit: 20, skip: 0 }) => {
  return {
    limit: parseInt(query.limit, 10) || defaults.limit,
    skip: parseInt(query.skip, 10) || defaults.skip,
  };
};

module.exports = {
  validateDropdownOption,
  validateMultipleDropdownOptions,
  buildPagination,
  parsePaginationParams,
};
