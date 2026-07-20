const checkedAt = '2026-07-20T00:00:00.000Z'

const IITB_ACADEMIC = Object.freeze({
  url: 'https://acad.iitb.ac.in/sites/default/files/Fee_Circular_for_UG_New_Entrants_2026-2027_0.pdf',
  title: 'Fee Structure for UG New Entrants - Autumn Semester 2026-27',
  organisation: 'Indian Institute of Technology Bombay - Academic Section',
  academicYear: '2026-27',
  documentDate: '2026-06-29',
  lastCheckedAt: checkedAt,
  verificationStatus: 'official',
  confidence: 1,
  contentSha256: 'dd840401a27aa8b4bd6613a5766059c8725b079a4e6232e3381b7c5b70275be9',
})

const IITB_HOSTEL = Object.freeze({
  url: 'https://acad.iitb.ac.in/sites/default/files/Hostel_Fee_Circular_New_UG_and_PG_Autumn_%202026-27.pdf',
  title: 'Hostel Fees Structure for New Undergraduate Students - Autumn Semester 2026-27',
  organisation: 'Indian Institute of Technology Bombay - Hostel Coordinating Unit',
  academicYear: '2026-27',
  documentDate: '2026-05-07',
  lastCheckedAt: checkedAt,
  verificationStatus: 'official',
  confidence: 1,
  contentSha256: '2dd41e1aa5f08470e158fc3e325e961e72323088bd866fb5d6ebcb129bd04df7',
})

const NITK_ACADEMIC = Object.freeze({
  url: 'https://www.l1.nitk.ac.in/document/attachments/9831/Fees_Structure_removed.pdf',
  title: 'Fee Structure for B.Tech Programme (I to IV Year) for Academic Year 2026-27',
  organisation: 'National Institute of Technology Karnataka, Surathkal - Academic Section',
  academicYear: '2026-27',
  documentDate: '2026-06-24',
  lastCheckedAt: checkedAt,
  verificationStatus: 'official',
  confidence: 1,
  contentSha256: 'f39169b1f9ae1b85a7bcb2a041a1177d681ae866d95ec86fce5718b2174d3c5d',
})

const NITK_HOSTEL = Object.freeze({
  url: 'https://www.l1.nitk.ac.in/document/attachments/9800/Fee_structure_2026-2027.pdf',
  title: 'NITK Hostel Fee Structure for 2026-2027',
  organisation: 'NITK Hostels Trust',
  academicYear: '2026-27',
  documentDate: '2026-06-15',
  lastCheckedAt: checkedAt,
  verificationStatus: 'official',
  confidence: 1,
  contentSha256: '0b949226114084a178bc8a4b1968c372f402c5167bbe63241172021c28945fe1',
})

const exact = value => ({ low: value, expected: value, high: value })

function component(code, label, category, value, source, options = {}) {
  return {
    code,
    label,
    category,
    amount: exact(value),
    recurrence: options.recurrence || 'one_time',
    occurrencesPerYear: options.occurrencesPerYear,
    mandatory: options.mandatory ?? true,
    refundable: options.refundable ?? false,
    source,
    notes: options.notes || '',
  }
}

function iitBombayPlan({ id, category, tuition }) {
  return {
    id,
    institutionId: 'iit-bombay',
    institutionName: 'Indian Institute of Technology Bombay',
    courseId: 'iitb-ug-new-entrant-2026',
    courseName: 'UG New Entrant (B.Tech./B.S./B.Des./Dual Degree) - Autumn Semester Only',
    academicYear: '2026-27',
    durationYears: 1,
    coverage: 'semester',
    coverageMonths: 6,
    studentContext: { category, domicile: 'all', gender: 'all', hostelRequired: true },
    components: [
      component('admission', 'Admission fee', 'admission', 9650, IITB_ACADEMIC),
      component('alumni', 'Alumni life membership', 'alumni', 5000, IITB_ACADEMIC),
      component('student-welfare', 'Student welfare fund', 'student_activity', 1350, IITB_ACADEMIC),
      component('tuition', 'Tuition fee', 'tuition', tuition, IITB_ACADEMIC, { notes: category === 'SC/ST/PwD' ? 'Official tuition exemption for SC/ST/PwD students.' : '' }),
      component('registration-exam', 'Registration and examination fee', 'examination', 2400, IITB_ACADEMIC),
      component('gymkhana', 'Gymkhana fee', 'student_activity', 2400, IITB_ACADEMIC),
      component('benevolent', 'Student benevolent fund', 'student_activity', 800, IITB_ACADEMIC),
      component('accident-insurance', 'Student accident insurance fund', 'insurance', 400, IITB_ACADEMIC),
      component('medical', 'Medical fee', 'other', 2150, IITB_ACADEMIC),
      component('institute-security', 'Institute security deposit', 'deposit', 5000, IITB_ACADEMIC, { refundable: true }),
      component('library-security', 'Library security deposit', 'deposit', 5000, IITB_ACADEMIC, { refundable: true }),
      component('hostel-charges', 'Hostel charges', 'hostel', 9150, IITB_HOSTEL),
      component('electricity-water', 'Electricity and water', 'hostel', 4000, IITB_HOSTEL),
      component('hostel-amenities', 'Hostel amenities fund', 'hostel', 1800, IITB_HOSTEL),
      component('hostel-mess-security', 'Hostel-mess security deposit', 'deposit', 5000, IITB_HOSTEL, { refundable: true }),
      component('mess-advance', 'Semester mess advance', 'mess', 22500, IITB_HOSTEL, { notes: 'Advance; final consumption/refund may differ.' }),
    ],
    aid: [],
    limitations: [
      'This record covers the Autumn semester for new entrants only, not the complete academic year or four-year programme.',
      'Seat-acceptance fee adjustments are excluded because they depend on the individual admission route and payment already made.',
      'Future semesters may be revised by the institute.',
    ],
  }
}

function nitkPlan({ id, category, tuitionRemission = 0, remissionLabel = '' }) {
  return {
    id,
    institutionId: 'nitk-surathkal',
    institutionName: 'National Institute of Technology Karnataka, Surathkal',
    courseId: 'nitk-btech-first-year-2026',
    courseName: 'B.Tech First Year - Hosteller (Shared Accommodation)',
    academicYear: '2026-27',
    durationYears: 1,
    coverage: 'academic_year',
    coverageMonths: 12,
    studentContext: { category, domicile: 'all', gender: 'all', hostelRequired: true },
    components: [
      component('tuition', 'Tuition fee (two semesters)', 'tuition', 62500, NITK_ACADEMIC, { recurrence: 'semester', occurrencesPerYear: 2 }),
      component('institute-admission', 'Institute admission fee', 'admission', 1410, NITK_ACADEMIC),
      component('development', 'Development fee (two semesters)', 'development', 2820, NITK_ACADEMIC, { recurrence: 'semester', occurrencesPerYear: 2 }),
      component('security', 'Institute security deposit', 'deposit', 7050, NITK_ACADEMIC, { refundable: true }),
      component('alumni-endowment', 'NITK Alma Mater endowment contribution', 'alumni', 3310, NITK_ACADEMIC),
      component('convocation', 'Convocation fee', 'convocation', 3480, NITK_ACADEMIC),
      component('library-resource', 'Library resource fee (two semesters)', 'library', 2820, NITK_ACADEMIC, { recurrence: 'semester', occurrencesPerYear: 2 }),
      component('career-development', 'Career development fee', 'placement', 2320, NITK_ACADEMIC),
      component('health-care', 'Health care facility', 'other', 1740, NITK_ACADEMIC),
      component('student-activities', 'Student activities fee', 'student_activity', 6950, NITK_ACADEMIC),
      component('campus-amenities', 'Campus amenities', 'other', 1740, NITK_ACADEMIC),
      component('group-insurance', 'Group insurance coverage', 'insurance', 1000, NITK_ACADEMIC),
      component('computing-resource', 'Computing resource fee', 'technology', 3710, NITK_ACADEMIC),
      component('institute-hostel-rent', 'Institute hostel rent including water/electricity (two semesters)', 'hostel', 9260, NITK_ACADEMIC, { recurrence: 'semester', occurrencesPerYear: 2 }),
      component('hostel-admission', 'Hostel admission fee', 'admission', 1000, NITK_HOSTEL),
      component('hostel-establishment', 'Hostel establishment charges (two semesters)', 'hostel', 8100, NITK_HOSTEL, { recurrence: 'semester', occurrencesPerYear: 2 }),
      component('hostel-maintenance-funds', 'Hostel maintenance and student funds (two semesters)', 'hostel', 3690, NITK_HOSTEL, { recurrence: 'semester', occurrencesPerYear: 2 }),
      component('hostel-extracurricular', 'Hostel extracurricular funds', 'student_activity', 520, NITK_HOSTEL),
      component('mess-advance', 'Mess advance (two semesters)', 'mess', 22000, NITK_HOSTEL, { recurrence: 'semester', occurrencesPerYear: 2, notes: 'Advance; final consumption/refund may differ.' }),
    ],
    aid: tuitionRemission > 0 ? [{
      code: 'tuition-remission',
      label: remissionLabel,
      amount: exact(tuitionRemission),
      recurrence: 'annual',
      status: 'confirmed',
      source: NITK_ACADEMIC,
    }] : [],
    limitations: [
      'This record covers the 2026-27 first year only; later-year values in the circular apply to older admission batches.',
      'The official circular marks fees provisional and subject to revision.',
      'Travel, books, laptop and personal living costs are not included because no official student-specific amount is available.',
    ],
  }
}

export const VERIFIED_FEE_SOURCES = Object.freeze([IITB_ACADEMIC, IITB_HOSTEL, NITK_ACADEMIC, NITK_HOSTEL])

export const VERIFIED_FEE_PILOT = Object.freeze([
  iitBombayPlan({ id: 'iitb-ug-autumn-2026-open', category: 'GEN/EWS/OBC-NCL', tuition: 100000 }),
  iitBombayPlan({ id: 'iitb-ug-autumn-2026-sc-st-pwd', category: 'SC/ST/PwD', tuition: 0 }),
  nitkPlan({ id: 'nitk-btech-first-year-2026-open', category: 'Open/EWS/OBC - income above 5 lakh' }),
  nitkPlan({ id: 'nitk-btech-first-year-2026-open-low-income', category: 'Open/EWS/OBC - family income below 1 lakh', tuitionRemission: 125000, remissionLabel: 'Full tuition remission for family income below Rs. 1 lakh' }),
  nitkPlan({ id: 'nitk-btech-first-year-2026-open-middle-income', category: 'Open/EWS/OBC - family income Rs. 1-5 lakh', tuitionRemission: 83333, remissionLabel: 'Two-thirds tuition remission for family income Rs. 1-5 lakh' }),
  nitkPlan({ id: 'nitk-btech-first-year-2026-sc-st-pwd', category: 'SC/ST/PwD', tuitionRemission: 125000, remissionLabel: 'Full tuition exemption for SC/ST/PwD students' }),
])
