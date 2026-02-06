// Default Medical History Template in Arabic
// Based on comprehensive patient history form

const defaultTemplate = {
    template_name: 'نموذج تاريخ مرضي شامل',
    sections: [
        {
            section_id: 'basic_info',
            title: 'البيانات الأساسية',
            fields: [
                { field_id: 'name', label: 'الاسم', type: 'text', required: true },
                { field_id: 'age', label: 'السن', type: 'text', required: false },
                { field_id: 'gender', label: 'النوع', type: 'radio', options: ['ذكر', 'أنثى'], required: false },
                { field_id: 'marital_status', label: 'الحالة الاجتماعية', type: 'text', required: false },
                { field_id: 'occupation', label: 'المهنة', type: 'text', required: false },
                { field_id: 'phone', label: 'رقم الهاتف', type: 'text', required: false },
                { field_id: 'address', label: 'العنوان', type: 'text', required: false }
            ]
        },
        {
            section_id: 'chief_complaint',
            title: 'الشكوى الرئيسية',
            fields: [
                { field_id: 'main_complaint', label: 'الشكوى الأساسية', type: 'long-text', required: false },
                { field_id: 'duration', label: 'منذ متى بدأت؟', type: 'text', required: false },
                { field_id: 'pattern', label: 'هل هي مستمرة أم متقطعة؟', type: 'radio', options: ['مستمرة', 'متقطعة'], required: false },
                { field_id: 'timing', label: 'هل تزداد أو تقل في أوقات معينة؟', type: 'text', required: false },
                { field_id: 'severity', label: 'شدة الشكوى (1-10)', type: 'text', required: false }
            ]
        },
        {
            section_id: 'present_illness',
            title: 'تاريخ الشكوى الحالية',
            fields: [
                { field_id: 'onset', label: 'بداية الأعراض', type: 'radio', options: ['مفاجئة', 'تدريجية'], required: false },
                { field_id: 'progression', label: 'تطور الأعراض مع الوقت', type: 'long-text', required: false },
                { field_id: 'aggravating_factors', label: 'عوامل تزيد الأعراض', type: 'text', required: false },
                { field_id: 'relieving_factors', label: 'عوامل تقلل الأعراض', type: 'text', required: false },
                { field_id: 'associated_symptoms', label: 'أعراض مصاحبة', type: 'long-text', required: false },
                { field_id: 'previous_treatment', label: 'هل تم تناول أدوية أو علاج سابق؟', type: 'radio', options: ['نعم', 'لا'], required: false },
                { field_id: 'previous_treatment_details', label: 'في حالة نعم، ما هو؟', type: 'text', required: false }
            ]
        },
        {
            section_id: 'past_medical',
            title: 'التاريخ المرضي السابق',
            fields: [
                { field_id: 'hypertension', label: 'ضغط دم مرتفع', type: 'checkbox', required: false },
                { field_id: 'diabetes', label: 'سكر', type: 'checkbox', required: false },
                { field_id: 'heart_disease', label: 'أمراض قلب', type: 'checkbox', required: false },
                { field_id: 'asthma', label: 'ربو / حساسية صدر', type: 'checkbox', required: false },
                { field_id: 'liver_disease', label: 'أمراض كبد', type: 'checkbox', required: false },
                { field_id: 'kidney_disease', label: 'أمراض كلى', type: 'checkbox', required: false },
                { field_id: 'thyroid_disease', label: 'أمراض الغدة الدرقية', type: 'checkbox', required: false },
                { field_id: 'anemia', label: 'أنيميا', type: 'checkbox', required: false },
                { field_id: 'autoimmune', label: 'أمراض مناعية', type: 'checkbox', required: false },
                { field_id: 'psychiatric', label: 'أمراض نفسية', type: 'checkbox', required: false },
                { field_id: 'other_medical', label: 'أخرى', type: 'text', required: false },
                { field_id: 'hospitalizations', label: 'تاريخ دخول مستشفى سابق', type: 'long-text', required: false },
                { field_id: 'surgeries', label: 'تاريخ عمليات جراحية', type: 'long-text', required: false }
            ]
        },
        {
            section_id: 'medications',
            title: 'الأدوية الحالية',
            fields: [
                { field_id: 'current_medications', label: 'الأدوية الحالية (اسم الدواء، الجرعة، عدد المرات، منذ متى)', type: 'long-text', required: false }
            ]
        },
        {
            section_id: 'allergies',
            title: 'الحساسية',
            fields: [
                { field_id: 'drug_allergy', label: 'حساسية أدوية', type: 'checkbox', required: false },
                { field_id: 'food_allergy', label: 'حساسية أطعمة', type: 'checkbox', required: false },
                { field_id: 'other_allergy', label: 'مواد أخرى', type: 'checkbox', required: false },
                { field_id: 'allergy_type', label: 'نوع الحساسية', type: 'text', required: false },
                { field_id: 'allergy_symptoms', label: 'الأعراض', type: 'text', required: false }
            ]
        },
        {
            section_id: 'family_history',
            title: 'التاريخ العائلي',
            fields: [
                { field_id: 'family_diabetes', label: 'سكر', type: 'checkbox', required: false },
                { field_id: 'family_hypertension', label: 'ضغط', type: 'checkbox', required: false },
                { field_id: 'family_heart', label: 'أمراض قلب', type: 'checkbox', required: false },
                { field_id: 'family_genetic', label: 'أمراض وراثية', type: 'checkbox', required: false },
                { field_id: 'family_cancer', label: 'أورام', type: 'checkbox', required: false },
                { field_id: 'family_psychiatric', label: 'أمراض نفسية', type: 'checkbox', required: false },
                { field_id: 'family_relation', label: 'درجة القرابة', type: 'text', required: false }
            ]
        },
        {
            section_id: 'social_history',
            title: 'التاريخ الاجتماعي ونمط الحياة',
            fields: [
                { field_id: 'smoking', label: 'التدخين', type: 'radio', options: ['لا', 'نعم'], required: false },
                { field_id: 'smoking_amount', label: 'عدد السجائر/اليوم', type: 'text', required: false },
                { field_id: 'alcohol', label: 'الكحول', type: 'radio', options: ['لا', 'نعم'], required: false },
                { field_id: 'drugs', label: 'تعاطي مخدرات', type: 'radio', options: ['لا', 'نعم'], required: false },
                { field_id: 'work_nature', label: 'طبيعة العمل', type: 'text', required: false },
                { field_id: 'physical_activity', label: 'مستوى النشاط البدني', type: 'text', required: false },
                { field_id: 'sleep_pattern', label: 'نمط النوم', type: 'text', required: false }
            ]
        },
        {
            section_id: 'review_general',
            title: 'مراجعة الأجهزة - عام',
            fields: [
                { field_id: 'weight_loss', label: 'فقدان وزن', type: 'checkbox', required: false },
                { field_id: 'weight_gain', label: 'زيادة وزن', type: 'checkbox', required: false },
                { field_id: 'fatigue', label: 'إرهاق عام', type: 'checkbox', required: false },
                { field_id: 'fever', label: 'حمى', type: 'checkbox', required: false }
            ]
        },
        {
            section_id: 'review_cardiovascular',
            title: 'القلب والدورة الدموية',
            fields: [
                { field_id: 'chest_pain', label: 'ألم بالصدر', type: 'checkbox', required: false },
                { field_id: 'palpitations', label: 'خفقان', type: 'checkbox', required: false },
                { field_id: 'leg_swelling', label: 'تورم بالساقين', type: 'checkbox', required: false },
                { field_id: 'dyspnea_exertion', label: 'ضيق نفس مع المجهود', type: 'checkbox', required: false }
            ]
        },
        {
            section_id: 'review_respiratory',
            title: 'الجهاز التنفسي',
            fields: [
                { field_id: 'cough', label: 'كحة', type: 'checkbox', required: false },
                { field_id: 'sputum', label: 'بلغم', type: 'checkbox', required: false },
                { field_id: 'dyspnea', label: 'ضيق تنفس', type: 'checkbox', required: false },
                { field_id: 'wheezing', label: 'صفير بالصدر', type: 'checkbox', required: false }
            ]
        },
        {
            section_id: 'review_gi',
            title: 'الجهاز الهضمي',
            fields: [
                { field_id: 'abdominal_pain', label: 'ألم بالبطن', type: 'checkbox', required: false },
                { field_id: 'vomiting', label: 'قيء', type: 'checkbox', required: false },
                { field_id: 'nausea', label: 'غثيان', type: 'checkbox', required: false },
                { field_id: 'diarrhea', label: 'إسهال', type: 'checkbox', required: false },
                { field_id: 'constipation', label: 'إمساك', type: 'checkbox', required: false },
                { field_id: 'heartburn', label: 'حموضة', type: 'checkbox', required: false },
                { field_id: 'blood_stool', label: 'دم بالبراز', type: 'checkbox', required: false }
            ]
        },
        {
            section_id: 'review_urinary',
            title: 'الجهاز البولي',
            fields: [
                { field_id: 'dysuria', label: 'حرقان بول', type: 'checkbox', required: false },
                { field_id: 'frequency', label: 'كثرة التبول', type: 'checkbox', required: false },
                { field_id: 'hematuria', label: 'دم بالبول', type: 'checkbox', required: false },
                { field_id: 'urinary_difficulty', label: 'صعوبة التبول', type: 'checkbox', required: false }
            ]
        },
        {
            section_id: 'review_neuro',
            title: 'الجهاز العصبي',
            fields: [
                { field_id: 'headache', label: 'صداع', type: 'checkbox', required: false },
                { field_id: 'dizziness', label: 'دوخة', type: 'checkbox', required: false },
                { field_id: 'syncope', label: 'إغماء', type: 'checkbox', required: false },
                { field_id: 'seizures', label: 'تشنجات', type: 'checkbox', required: false },
                { field_id: 'weakness_numbness', label: 'ضعف / تنميل', type: 'checkbox', required: false }
            ]
        },
        {
            section_id: 'review_musculoskeletal',
            title: 'العضلات والعظام',
            fields: [
                { field_id: 'joint_pain', label: 'آلام مفاصل', type: 'checkbox', required: false },
                { field_id: 'morning_stiffness', label: 'تيبس صباحي', type: 'checkbox', required: false },
                { field_id: 'joint_swelling', label: 'تورم مفاصل', type: 'checkbox', required: false },
                { field_id: 'muscle_pain', label: 'آلام عضلية', type: 'checkbox', required: false }
            ]
        },
        {
            section_id: 'review_skin',
            title: 'الجلد',
            fields: [
                { field_id: 'rash', label: 'طفح جلدي', type: 'checkbox', required: false },
                { field_id: 'itching', label: 'حكة', type: 'checkbox', required: false },
                { field_id: 'skin_color_change', label: 'تغير لون الجلد', type: 'checkbox', required: false },
                { field_id: 'hair_loss', label: 'تساقط شعر', type: 'checkbox', required: false }
            ]
        },
        {
            section_id: 'review_endocrine',
            title: 'الغدد الصماء',
            fields: [
                { field_id: 'polydipsia', label: 'عطش شديد', type: 'checkbox', required: false },
                { field_id: 'polyphagia', label: 'جوع زائد', type: 'checkbox', required: false },
                { field_id: 'heat_cold_intolerance', label: 'عدم تحمل حرارة / برودة', type: 'checkbox', required: false }
            ]
        },
        {
            section_id: 'review_psychiatric',
            title: 'نفسي / سلوكي',
            fields: [
                { field_id: 'anxiety', label: 'قلق', type: 'checkbox', required: false },
                { field_id: 'depression', label: 'اكتئاب', type: 'checkbox', required: false },
                { field_id: 'insomnia', label: 'أرق', type: 'checkbox', required: false },
                { field_id: 'mood_changes', label: 'تغيرات مزاجية', type: 'checkbox', required: false }
            ]
        },
        {
            section_id: 'gynecologic',
            title: 'للإناث فقط',
            fields: [
                { field_id: 'lmp', label: 'آخر دورة شهرية', type: 'text', required: false },
                { field_id: 'menstrual_regularity', label: 'انتظام الدورة', type: 'text', required: false },
                { field_id: 'pregnancies', label: 'عدد مرات الحمل', type: 'text', required: false },
                { field_id: 'deliveries', label: 'عدد الولادات', type: 'text', required: false },
                { field_id: 'contraception', label: 'وسائل منع الحمل', type: 'text', required: false }
            ]
        },
        {
            section_id: 'vital_signs',
            title: 'العلامات الحيوية',
            fields: [
                { field_id: 'bp', label: 'ضغط الدم', type: 'text', required: false },
                { field_id: 'pulse', label: 'النبض', type: 'text', required: false },
                { field_id: 'temp', label: 'الحرارة', type: 'text', required: false },
                { field_id: 'rr', label: 'معدل التنفس', type: 'text', required: false },
                { field_id: 'o2_sat', label: 'مستوى الأكسجين', type: 'text', required: false }
            ]
        },
        {
            section_id: 'general_exam',
            title: 'الفحص العام',
            fields: [
                { field_id: 'general_condition', label: 'الحالة العامة', type: 'radio', options: ['جيدة', 'متوسطة', 'سيئة'], required: false },
                { field_id: 'consciousness', label: 'مستوى الوعي', type: 'radio', options: ['واعي', 'مشوش', 'غير واعي'], required: false },
                { field_id: 'pallor', label: 'الشحوب', type: 'radio', options: ['لا', 'نعم'], required: false },
                { field_id: 'jaundice', label: 'الاصفرار', type: 'radio', options: ['لا', 'نعم'], required: false },
                { field_id: 'cyanosis', label: 'الزرقة', type: 'radio', options: ['لا', 'نعم'], required: false },
                { field_id: 'edema', label: 'الوذمة', type: 'radio', options: ['لا', 'نعم'], required: false },
                { field_id: 'edema_location', label: 'مكان الوذمة', type: 'text', required: false }
            ]
        },
        {
            section_id: 'diagnosis',
            title: 'التشخيص المبدئي',
            fields: [
                { field_id: 'initial_diagnosis', label: 'التشخيص المبدئي', type: 'long-text', required: false }
            ]
        },
        {
            section_id: 'plan',
            title: 'الخطة العلاجية',
            fields: [
                { field_id: 'investigations', label: 'تحاليل مطلوبة', type: 'long-text', required: false },
                { field_id: 'imaging', label: 'أشعة مطلوبة', type: 'long-text', required: false },
                { field_id: 'treatment', label: 'علاج دوائي', type: 'long-text', required: false },
                { field_id: 'advice', label: 'نصائح وتعليمات', type: 'long-text', required: false },
                { field_id: 'followup', label: 'موعد المتابعة', type: 'text', required: false }
            ]
        }
    ]
};

module.exports = defaultTemplate;
