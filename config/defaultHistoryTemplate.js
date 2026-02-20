const defaultTemplate = {
    template_name: 'Comprehensive Medical History Template',
    sections: [
        {
            section_id: 'basic_info',
            title: 'Basic Information',
            fields: [
                { field_id: 'name', label: 'Full Name', type: 'text', required: true },
                { field_id: 'age', label: 'Age', type: 'text', required: false },
                { field_id: 'gender', label: 'Gender', type: 'radio', options: ['Male', 'Female'], required: false },
                { field_id: 'marital_status', label: 'Marital Status', type: 'text', required: false },
                { field_id: 'occupation', label: 'Occupation', type: 'text', required: false },
                { field_id: 'phone', label: 'Phone Number', type: 'text', required: false },
                { field_id: 'address', label: 'Address', type: 'text', required: false }
            ]
        },
        {
            section_id: 'chief_complaint',
            title: 'Chief Complaint',
            fields: [
                { field_id: 'main_complaint', label: 'Main Complaint', type: 'long-text', required: false },
                { field_id: 'duration', label: 'Duration', type: 'text', required: false },
                { field_id: 'pattern', label: 'Pattern', type: 'radio', options: ['Continuous', 'Intermittent'], required: false },
                { field_id: 'timing', label: 'Aggravating / Relieving Timing', type: 'text', required: false },
                { field_id: 'severity', label: 'Severity (1–10)', type: 'text', required: false }
            ]
        },
        {
            section_id: 'present_illness',
            title: 'History of Present Illness',
            fields: [
                { field_id: 'onset', label: 'Onset', type: 'radio', options: ['Sudden', 'Gradual'], required: false },
                { field_id: 'progression', label: 'Progression Over Time', type: 'long-text', required: false },
                { field_id: 'aggravating_factors', label: 'Aggravating Factors', type: 'text', required: false },
                { field_id: 'relieving_factors', label: 'Relieving Factors', type: 'text', required: false },
                { field_id: 'associated_symptoms', label: 'Associated Symptoms', type: 'long-text', required: false },
                { field_id: 'previous_treatment', label: 'Previous Treatment / Medications', type: 'radio', options: ['Yes', 'No'], required: false },
                { field_id: 'previous_treatment_details', label: 'If Yes, Details', type: 'text', required: false }
            ]
        },
        {
            section_id: 'past_medical',
            title: 'Past Medical History',
            fields: [
                { field_id: 'hypertension', label: 'Hypertension', type: 'checkbox', required: false },
                { field_id: 'diabetes', label: 'Diabetes', type: 'checkbox', required: false },
                { field_id: 'heart_disease', label: 'Heart Disease', type: 'checkbox', required: false },
                { field_id: 'asthma', label: 'Asthma / COPD', type: 'checkbox', required: false },
                { field_id: 'liver_disease', label: 'Liver Disease', type: 'checkbox', required: false },
                { field_id: 'kidney_disease', label: 'Kidney Disease', type: 'checkbox', required: false },
                { field_id: 'thyroid_disease', label: 'Thyroid Disease', type: 'checkbox', required: false },
                { field_id: 'anemia', label: 'Anemia', type: 'checkbox', required: false },
                { field_id: 'autoimmune', label: 'Autoimmune Disease', type: 'checkbox', required: false },
                { field_id: 'psychiatric', label: 'Psychiatric Disorder', type: 'checkbox', required: false },
                { field_id: 'other_medical', label: 'Other', type: 'text', required: false },
                { field_id: 'hospitalizations', label: 'Previous Hospitalizations', type: 'long-text', required: false },
                { field_id: 'surgeries', label: 'Surgical History', type: 'long-text', required: false }
            ]
        },
        {
            section_id: 'medications',
            title: 'Current Medications',
            fields: [
                { field_id: 'current_medications', label: 'Medications (name, dose, frequency, duration)', type: 'long-text', required: false }
            ]
        },
        {
            section_id: 'allergies',
            title: 'Allergies',
            fields: [
                { field_id: 'drug_allergy', label: 'Drug Allergy', type: 'checkbox', required: false },
                { field_id: 'food_allergy', label: 'Food Allergy', type: 'checkbox', required: false },
                { field_id: 'other_allergy', label: 'Other Allergy', type: 'checkbox', required: false },
                { field_id: 'allergy_type', label: 'Allergy Type', type: 'text', required: false },
                { field_id: 'allergy_symptoms', label: 'Allergy Symptoms', type: 'text', required: false }
            ]
        },
        {
            section_id: 'family_history',
            title: 'Family History',
            fields: [
                { field_id: 'family_diabetes', label: 'Diabetes', type: 'checkbox', required: false },
                { field_id: 'family_hypertension', label: 'Hypertension', type: 'checkbox', required: false },
                { field_id: 'family_heart', label: 'Heart Disease', type: 'checkbox', required: false },
                { field_id: 'family_genetic', label: 'Genetic Disorders', type: 'checkbox', required: false },
                { field_id: 'family_cancer', label: 'Cancer', type: 'checkbox', required: false },
                { field_id: 'family_psychiatric', label: 'Psychiatric Disorders', type: 'checkbox', required: false },
                { field_id: 'family_relation', label: 'Relation to Patient', type: 'text', required: false }
            ]
        },
        {
            section_id: 'social_history',
            title: 'Social History & Lifestyle',
            fields: [
                { field_id: 'smoking', label: 'Smoking', type: 'radio', options: ['No', 'Yes'], required: false },
                { field_id: 'smoking_amount', label: 'Cigarettes / Day', type: 'text', required: false },
                { field_id: 'alcohol', label: 'Alcohol', type: 'radio', options: ['No', 'Yes'], required: false },
                { field_id: 'drugs', label: 'Substance Use', type: 'radio', options: ['No', 'Yes'], required: false },
                { field_id: 'work_nature', label: 'Nature of Work', type: 'text', required: false },
                { field_id: 'physical_activity', label: 'Physical Activity Level', type: 'text', required: false },
                { field_id: 'sleep_pattern', label: 'Sleep Pattern', type: 'text', required: false }
            ]
        },
        {
            section_id: 'review_general',
            title: 'Review of Systems — General',
            fields: [
                { field_id: 'weight_loss', label: 'Weight Loss', type: 'checkbox', required: false },
                { field_id: 'weight_gain', label: 'Weight Gain', type: 'checkbox', required: false },
                { field_id: 'fatigue', label: 'Fatigue', type: 'checkbox', required: false },
                { field_id: 'fever', label: 'Fever', type: 'checkbox', required: false }
            ]
        },
        {
            section_id: 'review_cardiovascular',
            title: 'Cardiovascular',
            fields: [
                { field_id: 'chest_pain', label: 'Chest Pain', type: 'checkbox', required: false },
                { field_id: 'palpitations', label: 'Palpitations', type: 'checkbox', required: false },
                { field_id: 'leg_swelling', label: 'Leg Swelling', type: 'checkbox', required: false },
                { field_id: 'dyspnea_exertion', label: 'Dyspnea on Exertion', type: 'checkbox', required: false }
            ]
        },
        {
            section_id: 'review_respiratory',
            title: 'Respiratory',
            fields: [
                { field_id: 'cough', label: 'Cough', type: 'checkbox', required: false },
                { field_id: 'sputum', label: 'Sputum', type: 'checkbox', required: false },
                { field_id: 'dyspnea', label: 'Dyspnea', type: 'checkbox', required: false },
                { field_id: 'wheezing', label: 'Wheezing', type: 'checkbox', required: false }
            ]
        },
        {
            section_id: 'review_gi',
            title: 'Gastrointestinal',
            fields: [
                { field_id: 'abdominal_pain', label: 'Abdominal Pain', type: 'checkbox', required: false },
                { field_id: 'vomiting', label: 'Vomiting', type: 'checkbox', required: false },
                { field_id: 'nausea', label: 'Nausea', type: 'checkbox', required: false },
                { field_id: 'diarrhea', label: 'Diarrhea', type: 'checkbox', required: false },
                { field_id: 'constipation', label: 'Constipation', type: 'checkbox', required: false },
                { field_id: 'heartburn', label: 'Heartburn / Acid Reflux', type: 'checkbox', required: false },
                { field_id: 'blood_stool', label: 'Blood in Stool', type: 'checkbox', required: false }
            ]
        },
        {
            section_id: 'review_urinary',
            title: 'Urinary',
            fields: [
                { field_id: 'dysuria', label: 'Dysuria (Painful Urination)', type: 'checkbox', required: false },
                { field_id: 'frequency', label: 'Urinary Frequency', type: 'checkbox', required: false },
                { field_id: 'hematuria', label: 'Blood in Urine', type: 'checkbox', required: false },
                { field_id: 'urinary_difficulty', label: 'Difficulty Urinating', type: 'checkbox', required: false }
            ]
        },
        {
            section_id: 'review_neuro',
            title: 'Neurological',
            fields: [
                { field_id: 'headache', label: 'Headache', type: 'checkbox', required: false },
                { field_id: 'dizziness', label: 'Dizziness', type: 'checkbox', required: false },
                { field_id: 'syncope', label: 'Syncope / Fainting', type: 'checkbox', required: false },
                { field_id: 'seizures', label: 'Seizures', type: 'checkbox', required: false },
                { field_id: 'weakness_numbness', label: 'Weakness / Numbness', type: 'checkbox', required: false }
            ]
        },
        {
            section_id: 'review_musculoskeletal',
            title: 'Musculoskeletal',
            fields: [
                { field_id: 'joint_pain', label: 'Joint Pain', type: 'checkbox', required: false },
                { field_id: 'morning_stiffness', label: 'Morning Stiffness', type: 'checkbox', required: false },
                { field_id: 'joint_swelling', label: 'Joint Swelling', type: 'checkbox', required: false },
                { field_id: 'muscle_pain', label: 'Muscle Pain', type: 'checkbox', required: false }
            ]
        },
        {
            section_id: 'review_skin',
            title: 'Skin',
            fields: [
                { field_id: 'rash', label: 'Rash', type: 'checkbox', required: false },
                { field_id: 'itching', label: 'Itching', type: 'checkbox', required: false },
                { field_id: 'skin_color_change', label: 'Skin Color Change', type: 'checkbox', required: false },
                { field_id: 'hair_loss', label: 'Hair Loss', type: 'checkbox', required: false }
            ]
        },
        {
            section_id: 'review_endocrine',
            title: 'Endocrine',
            fields: [
                { field_id: 'polydipsia', label: 'Excessive Thirst', type: 'checkbox', required: false },
                { field_id: 'polyphagia', label: 'Excessive Hunger', type: 'checkbox', required: false },
                { field_id: 'heat_cold_intolerance', label: 'Heat / Cold Intolerance', type: 'checkbox', required: false }
            ]
        },
        {
            section_id: 'review_psychiatric',
            title: 'Psychiatric / Behavioral',
            fields: [
                { field_id: 'anxiety', label: 'Anxiety', type: 'checkbox', required: false },
                { field_id: 'depression', label: 'Depression', type: 'checkbox', required: false },
                { field_id: 'insomnia', label: 'Insomnia', type: 'checkbox', required: false },
                { field_id: 'mood_changes', label: 'Mood Changes', type: 'checkbox', required: false }
            ]
        },
        {
            section_id: 'gynecologic',
            title: 'Gynecological (Female Only)',
            fields: [
                { field_id: 'lmp', label: 'Last Menstrual Period (LMP)', type: 'text', required: false },
                { field_id: 'menstrual_regularity', label: 'Menstrual Regularity', type: 'text', required: false },
                { field_id: 'pregnancies', label: 'Number of Pregnancies', type: 'text', required: false },
                { field_id: 'deliveries', label: 'Number of Deliveries', type: 'text', required: false },
                { field_id: 'contraception', label: 'Contraception Method', type: 'text', required: false }
            ]
        },
        {
            section_id: 'vital_signs',
            title: 'Vital Signs',
            fields: [
                { field_id: 'bp', label: 'Blood Pressure', type: 'text', required: false },
                { field_id: 'pulse', label: 'Pulse', type: 'text', required: false },
                { field_id: 'temp', label: 'Temperature', type: 'text', required: false },
                { field_id: 'rr', label: 'Respiratory Rate', type: 'text', required: false },
                { field_id: 'o2_sat', label: 'O₂ Saturation', type: 'text', required: false }
            ]
        },
        {
            section_id: 'general_exam',
            title: 'General Examination',
            fields: [
                { field_id: 'general_condition', label: 'General Condition', type: 'radio', options: ['Good', 'Fair', 'Poor'], required: false },
                { field_id: 'consciousness', label: 'Consciousness', type: 'radio', options: ['Alert', 'Confused', 'Unconscious'], required: false },
                { field_id: 'pallor', label: 'Pallor', type: 'radio', options: ['No', 'Yes'], required: false },
                { field_id: 'jaundice', label: 'Jaundice', type: 'radio', options: ['No', 'Yes'], required: false },
                { field_id: 'cyanosis', label: 'Cyanosis', type: 'radio', options: ['No', 'Yes'], required: false },
                { field_id: 'edema', label: 'Edema', type: 'radio', options: ['No', 'Yes'], required: false },
                { field_id: 'edema_location', label: 'Edema Location', type: 'text', required: false }
            ]
        },
        {
            section_id: 'diagnosis',
            title: 'Preliminary Diagnosis',
            fields: [
                { field_id: 'initial_diagnosis', label: 'Preliminary Diagnosis', type: 'long-text', required: false }
            ]
        },
        {
            section_id: 'plan',
            title: 'Management Plan',
            fields: [
                { field_id: 'investigations', label: 'Investigations Required', type: 'long-text', required: false },
                { field_id: 'imaging', label: 'Imaging Required', type: 'long-text', required: false },
                { field_id: 'treatment', label: 'Drug Treatment', type: 'long-text', required: false },
                { field_id: 'advice', label: 'Advice & Instructions', type: 'long-text', required: false },
                { field_id: 'followup', label: 'Follow-up Date', type: 'text', required: false }
            ]
        }
    ]
};

module.exports = defaultTemplate;
