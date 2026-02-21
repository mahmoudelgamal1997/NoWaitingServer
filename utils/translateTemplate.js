const defaultTemplate = require('../config/defaultHistoryTemplate');

// Build lookup maps from the default (English) template
const SECTION_TITLES = {};
const FIELD_LABELS = {};

defaultTemplate.sections.forEach(section => {
    SECTION_TITLES[section.section_id] = section.title;
    section.fields.forEach(field => {
        FIELD_LABELS[field.field_id] = field.label;
    });
});

/**
 * Returns a translated copy of a template object with English labels.
 * The original object / MongoDB document is never mutated.
 * Any field_id or section_id not found in the map keeps its stored label as-is.
 */
function translateTemplate(template) {
    if (!template) return template;

    // Support both plain objects and Mongoose documents
    const raw = typeof template.toObject === 'function' ? template.toObject() : template;

    return {
        ...raw,
        sections: (raw.sections || []).map(section => ({
            ...section,
            title: SECTION_TITLES[section.section_id] || section.title,
            fields: (section.fields || []).map(field => ({
                ...field,
                label: FIELD_LABELS[field.field_id] || field.label,
            })),
        })),
    };
}

module.exports = { translateTemplate };
