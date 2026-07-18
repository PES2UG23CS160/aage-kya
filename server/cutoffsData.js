// Curated historical cutoff ranks for top colleges in the database (2023–2025)
// Category codes:
// - JEE/NEET: 'General', 'OBC', 'SC', 'ST'
// - KCET: 'GM' (General Merit), 'OBC', 'SC', 'ST'

export const HISTORICAL_CUTOFFS = [
  // ─── IIT BOMBAY (JEE Advanced) ─────────────────────────────────────────────
  { college_name: 'IIT Bombay', exam: 'JEE', course: 'Computer Science Engineering', category: 'General', year: 2025, closing_rank: 65 },
  { college_name: 'IIT Bombay', exam: 'JEE', course: 'Computer Science Engineering', category: 'General', year: 2024, closing_rank: 68 },
  { college_name: 'IIT Bombay', exam: 'JEE', course: 'Computer Science Engineering', category: 'General', year: 2023, closing_rank: 67 },
  { college_name: 'IIT Bombay', exam: 'JEE', course: 'Computer Science Engineering', category: 'OBC', year: 2025, closing_rank: 48 },
  { college_name: 'IIT Bombay', exam: 'JEE', course: 'Computer Science Engineering', category: 'OBC', year: 2024, closing_rank: 50 },
  { college_name: 'IIT Bombay', exam: 'JEE', course: 'Computer Science Engineering', category: 'OBC', year: 2023, closing_rank: 52 },
  { college_name: 'IIT Bombay', exam: 'JEE', course: 'Computer Science Engineering', category: 'SC', year: 2025, closing_rank: 25 },
  { college_name: 'IIT Bombay', exam: 'JEE', course: 'Computer Science Engineering', category: 'SC', year: 2024, closing_rank: 28 },
  { college_name: 'IIT Bombay', exam: 'JEE', course: 'Computer Science Engineering', category: 'SC', year: 2023, closing_rank: 29 },

  { college_name: 'IIT Bombay', exam: 'JEE', course: 'Electronics Engineering', category: 'General', year: 2025, closing_rank: 280 },
  { college_name: 'IIT Bombay', exam: 'JEE', course: 'Electronics Engineering', category: 'General', year: 2024, closing_rank: 290 },
  { college_name: 'IIT Bombay', exam: 'JEE', course: 'Electronics Engineering', category: 'General', year: 2023, closing_rank: 285 },

  // ─── IIT DELHI (JEE Advanced) ─────────────────────────────────────────────
  { college_name: 'IIT Delhi', exam: 'JEE', course: 'Computer Science Engineering', category: 'General', year: 2025, closing_rank: 110 },
  { college_name: 'IIT Delhi', exam: 'JEE', course: 'Computer Science Engineering', category: 'General', year: 2024, closing_rank: 116 },
  { college_name: 'IIT Delhi', exam: 'JEE', course: 'Computer Science Engineering', category: 'General', year: 2023, closing_rank: 115 },
  { college_name: 'IIT Delhi', exam: 'JEE', course: 'Electronics Engineering', category: 'General', year: 2025, closing_rank: 350 },
  { college_name: 'IIT Delhi', exam: 'JEE', course: 'Electronics Engineering', category: 'General', year: 2024, closing_rank: 360 },
  { college_name: 'IIT Delhi', exam: 'JEE', course: 'Electronics Engineering', category: 'General', year: 2023, closing_rank: 358 },

  // ─── IIT MADRAS (JEE Advanced) ────────────────────────────────────────────
  { college_name: 'IIT Madras', exam: 'JEE', course: 'Computer Science Engineering', category: 'General', year: 2025, closing_rank: 142 },
  { college_name: 'IIT Madras', exam: 'JEE', course: 'Computer Science Engineering', category: 'General', year: 2024, closing_rank: 148 },
  { college_name: 'IIT Madras', exam: 'JEE', course: 'Computer Science Engineering', category: 'General', year: 2023, closing_rank: 144 },

  // ─── NIT SURATHKAL (JEE Main) ─────────────────────────────────────────────
  { college_name: 'NIT Surathkal', exam: 'JEE', course: 'Computer Science Engineering', category: 'General', year: 2025, closing_rank: 1580 },
  { college_name: 'NIT Surathkal', exam: 'JEE', course: 'Computer Science Engineering', category: 'General', year: 2024, closing_rank: 1620 },
  { college_name: 'NIT Surathkal', exam: 'JEE', course: 'Computer Science Engineering', category: 'General', year: 2023, closing_rank: 1540 },
  { college_name: 'NIT Surathkal', exam: 'JEE', course: 'Computer Science Engineering', category: 'OBC', year: 2025, closing_rank: 510 },
  { college_name: 'NIT Surathkal', exam: 'JEE', course: 'Computer Science Engineering', category: 'OBC', year: 2024, closing_rank: 530 },
  { college_name: 'NIT Surathkal', exam: 'JEE', course: 'Computer Science Engineering', category: 'OBC', year: 2023, closing_rank: 490 },

  { college_name: 'NIT Surathkal', exam: 'JEE', course: 'Electronics & Communication Engineering', category: 'General', year: 2025, closing_rank: 3200 },
  { college_name: 'NIT Surathkal', exam: 'JEE', course: 'Electronics & Communication Engineering', category: 'General', year: 2024, closing_rank: 3400 },
  { college_name: 'NIT Surathkal', exam: 'JEE', course: 'Electronics & Communication Engineering', category: 'General', year: 2023, closing_rank: 3100 },

  { college_name: 'NIT Surathkal', exam: 'JEE', course: 'Mechanical Engineering', category: 'General', year: 2025, closing_rank: 11500 },
  { college_name: 'NIT Surathkal', exam: 'JEE', course: 'Mechanical Engineering', category: 'General', year: 2024, closing_rank: 12000 },
  { college_name: 'NIT Surathkal', exam: 'JEE', course: 'Mechanical Engineering', category: 'General', year: 2023, closing_rank: 11000 },

  // ─── NIT TRICHY (JEE Main) ────────────────────────────────────────────────
  { college_name: 'NIT Trichy', exam: 'JEE', course: 'Computer Science Engineering', category: 'General', year: 2025, closing_rank: 1100 },
  { college_name: 'NIT Trichy', exam: 'JEE', course: 'Computer Science Engineering', category: 'General', year: 2024, closing_rank: 1150 },
  { college_name: 'NIT Trichy', exam: 'JEE', course: 'Computer Science Engineering', category: 'General', year: 2023, closing_rank: 1080 },
  { college_name: 'NIT Trichy', exam: 'JEE', course: 'Electronics & Communication Engineering', category: 'General', year: 2025, closing_rank: 2500 },
  { college_name: 'NIT Trichy', exam: 'JEE', course: 'Electronics & Communication Engineering', category: 'General', year: 2024, closing_rank: 2600 },
  { college_name: 'NIT Trichy', exam: 'JEE', course: 'Electronics & Communication Engineering', category: 'General', year: 2023, closing_rank: 2450 },

  // ─── BITS PILANI (BITSAT / JEE equivalent) ──────────────────────────────────
  { college_name: 'BITS Pilani', exam: 'JEE', course: 'Computer Science Engineering', category: 'General', year: 2025, closing_rank: 3200 },
  { college_name: 'BITS Pilani', exam: 'JEE', course: 'Computer Science Engineering', category: 'General', year: 2024, closing_rank: 3150 },
  { college_name: 'BITS Pilani', exam: 'JEE', course: 'Computer Science Engineering', category: 'General', year: 2023, closing_rank: 3080 },
  { college_name: 'BITS Pilani', exam: 'JEE', course: 'Mechanical Engineering', category: 'General', year: 2025, closing_rank: 9800 },
  { college_name: 'BITS Pilani', exam: 'JEE', course: 'Mechanical Engineering', category: 'General', year: 2024, closing_rank: 9500 },
  { college_name: 'BITS Pilani', exam: 'JEE', course: 'Mechanical Engineering', category: 'General', year: 2023, closing_rank: 9100 },

  // ─── RV COLLEGE OF ENGINEERING (KCET) ──────────────────────────────────────
  { college_name: 'RV College of Engineering', exam: 'KCET', course: 'Computer Science Engineering', category: 'GM', year: 2025, closing_rank: 235 },
  { college_name: 'RV College of Engineering', exam: 'KCET', course: 'Computer Science Engineering', category: 'GM', year: 2024, closing_rank: 250 },
  { college_name: 'RV College of Engineering', exam: 'KCET', course: 'Computer Science Engineering', category: 'GM', year: 2023, closing_rank: 242 },
  { college_name: 'RV College of Engineering', exam: 'KCET', course: 'Computer Science Engineering', category: 'OBC', year: 2025, closing_rank: 450 },
  { college_name: 'RV College of Engineering', exam: 'KCET', course: 'Computer Science Engineering', category: 'OBC', year: 2024, closing_rank: 480 },
  { college_name: 'RV College of Engineering', exam: 'KCET', course: 'Computer Science Engineering', category: 'OBC', year: 2023, closing_rank: 460 },
  { college_name: 'RV College of Engineering', exam: 'KCET', course: 'Computer Science Engineering', category: 'SC', year: 2025, closing_rank: 1580 },
  { college_name: 'RV College of Engineering', exam: 'KCET', course: 'Computer Science Engineering', category: 'SC', year: 2024, closing_rank: 1650 },
  { college_name: 'RV College of Engineering', exam: 'KCET', course: 'Computer Science Engineering', category: 'SC', year: 2023, closing_rank: 1600 },

  { college_name: 'RV College of Engineering', exam: 'KCET', course: 'Electronics & Communication Engineering', category: 'GM', year: 2025, closing_rank: 950 },
  { college_name: 'RV College of Engineering', exam: 'KCET', course: 'Electronics & Communication Engineering', category: 'GM', year: 2024, closing_rank: 980 },
  { college_name: 'RV College of Engineering', exam: 'KCET', course: 'Electronics & Communication Engineering', category: 'GM', year: 2023, closing_rank: 920 },

  { college_name: 'RV College of Engineering', exam: 'KCET', course: 'Mechanical Engineering', category: 'GM', year: 2025, closing_rank: 5400 },
  { college_name: 'RV College of Engineering', exam: 'KCET', course: 'Mechanical Engineering', category: 'GM', year: 2024, closing_rank: 5600 },
  { college_name: 'RV College of Engineering', exam: 'KCET', course: 'Mechanical Engineering', category: 'GM', year: 2023, closing_rank: 5200 },

  // ─── PES UNIVERSITY (KCET) ─────────────────────────────────────────────────
  { college_name: 'PES University', exam: 'KCET', course: 'Computer Science Engineering', category: 'GM', year: 2025, closing_rank: 980 },
  { college_name: 'PES University', exam: 'KCET', course: 'Computer Science Engineering', category: 'GM', year: 2024, closing_rank: 1050 },
  { college_name: 'PES University', exam: 'KCET', course: 'Computer Science Engineering', category: 'GM', year: 2023, closing_rank: 1010 },
  { college_name: 'PES University', exam: 'KCET', course: 'Electronics & Communication Engineering', category: 'GM', year: 2025, closing_rank: 2800 },
  { college_name: 'PES University', exam: 'KCET', course: 'Electronics & Communication Engineering', category: 'GM', year: 2024, closing_rank: 3000 },
  { college_name: 'PES University', exam: 'KCET', course: 'Electronics & Communication Engineering', category: 'GM', year: 2023, closing_rank: 2900 },

  // ─── BMS COLLEGE OF ENGINEERING (KCET) ─────────────────────────────────────
  { college_name: 'BMS College of Engineering', exam: 'KCET', course: 'Computer Science Engineering', category: 'GM', year: 2025, closing_rank: 820 },
  { college_name: 'BMS College of Engineering', exam: 'KCET', course: 'Computer Science Engineering', category: 'GM', year: 2024, closing_rank: 890 },
  { college_name: 'BMS College of Engineering', exam: 'KCET', course: 'Computer Science Engineering', category: 'GM', year: 2023, closing_rank: 850 },

  // ─── AIIMS NEW DELHI (NEET) ───────────────────────────────────────────────
  { college_name: 'AIIMS New Delhi', exam: 'NEET', course: 'MBBS', category: 'General', year: 2025, closing_rank: 50 },
  { college_name: 'AIIMS New Delhi', exam: 'NEET', course: 'MBBS', category: 'General', year: 2024, closing_rank: 53 },
  { college_name: 'AIIMS New Delhi', exam: 'NEET', course: 'MBBS', category: 'General', year: 2023, closing_rank: 57 },
  { college_name: 'AIIMS New Delhi', exam: 'NEET', course: 'MBBS', category: 'OBC', year: 2025, closing_rank: 220 },
  { college_name: 'AIIMS New Delhi', exam: 'NEET', course: 'MBBS', category: 'OBC', year: 2024, closing_rank: 240 },
  { college_name: 'AIIMS New Delhi', exam: 'NEET', course: 'MBBS', category: 'OBC', year: 2023, closing_rank: 250 },
  { college_name: 'AIIMS New Delhi', exam: 'NEET', course: 'MBBS', category: 'SC', year: 2025, closing_rank: 980 },
  { college_name: 'AIIMS New Delhi', exam: 'NEET', course: 'MBBS', category: 'SC', year: 2024, closing_rank: 1020 },
  { college_name: 'AIIMS New Delhi', exam: 'NEET', course: 'MBBS', category: 'SC', year: 2023, closing_rank: 990 },

  // ─── AIIMS MUMBAI (NEET) ──────────────────────────────────────────────────
  { college_name: 'AIIMS Mumbai', exam: 'NEET', course: 'MBBS', category: 'General', year: 2025, closing_rank: 180 },
  { college_name: 'AIIMS Mumbai', exam: 'NEET', course: 'MBBS', category: 'General', year: 2024, closing_rank: 195 },
  { college_name: 'AIIMS Mumbai', exam: 'NEET', course: 'MBBS', category: 'General', year: 2023, closing_rank: 210 },

  // ─── AIIMS BHOPAL (NEET) ──────────────────────────────────────────────────
  { college_name: 'AIIMS Bhopal', exam: 'NEET', course: 'MBBS', category: 'General', year: 2025, closing_rank: 550 },
  { college_name: 'AIIMS Bhopal', exam: 'NEET', course: 'MBBS', category: 'General', year: 2024, closing_rank: 580 },
  { college_name: 'AIIMS Bhopal', exam: 'NEET', course: 'MBBS', category: 'General', year: 2023, closing_rank: 620 }
]
