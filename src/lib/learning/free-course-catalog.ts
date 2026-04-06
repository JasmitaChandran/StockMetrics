export type LearningProvider = 'Khan Academy' | 'MIT OpenCourseWare' | 'Open Yale Courses';
export type LearningCategory = 'Stocks' | 'Investing' | 'Personal Finance' | 'Markets' | 'Finance Theory';
export type LearningLevel = 'Beginner' | 'Intermediate' | 'Advanced';
export type LearningTheme = 'emerald' | 'blue' | 'indigo' | 'amber' | 'rose' | 'cyan';

export interface FreeCourseResource {
  id: string;
  title: string;
  provider: LearningProvider;
  url: string;
  category: LearningCategory;
  level: LearningLevel;
  format: string;
  summary: string;
  highlights: string[];
  thumbnailTitle: string;
  thumbnailSubtitle: string;
  thumbnailTheme: LearningTheme;
}

interface CourseSeed {
  id: string;
  title: string;
  provider: LearningProvider;
  url: string;
  category: LearningCategory;
  level: LearningLevel;
  summary: string;
  highlights?: string[];
  format?: string;
  thumbnailTitle?: string;
  thumbnailSubtitle?: string;
  thumbnailTheme?: LearningTheme;
}

const categoryDefaults: Record<
  LearningCategory,
  { theme: LearningTheme; highlights: string[] }
> = {
  Stocks: {
    theme: 'blue',
    highlights: ['Equity basics', 'Public markets', 'Valuation'],
  },
  Investing: {
    theme: 'emerald',
    highlights: ['Long-term investing', 'Risk and return', 'Portfolio basics'],
  },
  'Personal Finance': {
    theme: 'amber',
    highlights: ['Money management', 'Debt and taxes', 'Financial planning'],
  },
  Markets: {
    theme: 'rose',
    highlights: ['Market structure', 'Risk management', 'Macro context'],
  },
  'Finance Theory': {
    theme: 'indigo',
    highlights: ['Valuation theory', 'Capital markets', 'Financial models'],
  },
};

const providerFormats: Record<LearningProvider, string> = {
  'Khan Academy': 'Self-paced lessons and videos',
  'MIT OpenCourseWare': 'Lecture notes, assignments, and open course materials',
  'Open Yale Courses': 'Open university lecture series',
};

function createCourse(seed: CourseSeed): FreeCourseResource {
  const defaults = categoryDefaults[seed.category];

  return {
    ...seed,
    format: seed.format ?? providerFormats[seed.provider],
    highlights: seed.highlights ?? defaults.highlights,
    thumbnailTitle: seed.thumbnailTitle ?? seed.title,
    thumbnailSubtitle: seed.thumbnailSubtitle ?? `${seed.provider} • ${seed.level}`,
    thumbnailTheme: seed.thumbnailTheme ?? defaults.theme,
  };
}

export const freeCourseCatalog: FreeCourseResource[] = [
  createCourse({
    id: 'khan-core-interest-debt',
    title: 'Interest and Debt',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/economics-finance-domain/core-finance/interest-tutorial',
    category: 'Personal Finance',
    level: 'Beginner',
    summary:
      'Build a strong base in interest rates, debt, credit cards, and the borrowing concepts behind everyday financial decisions.',
    highlights: ['APR and interest', 'Credit cards', 'Compounding'],
    thumbnailTitle: 'Interest & Debt',
    thumbnailSubtitle: 'Borrowing, compounding, and credit',
  }),
  createCourse({
    id: 'khan-core-housing',
    title: 'Housing',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/economics-finance-domain/core-finance/housing',
    category: 'Personal Finance',
    level: 'Beginner',
    summary:
      'Learn the financial side of housing decisions, including mortgages, affordability, renting versus buying, and home-related costs.',
    highlights: ['Mortgages', 'Rent vs buy', 'Housing costs'],
  }),
  createCourse({
    id: 'khan-core-inflation',
    title: 'Inflation',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/economics-finance-domain/core-finance/inflation-tutorial',
    category: 'Markets',
    level: 'Beginner',
    summary:
      'Understand inflation, purchasing power, CPI, and how price changes affect savings, investments, and the broader economy.',
    highlights: ['CPI basics', 'Purchasing power', 'Macro effects'],
  }),
  createCourse({
    id: 'khan-core-taxes',
    title: 'Taxes',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/economics-finance-domain/core-finance/taxes-topic',
    category: 'Personal Finance',
    level: 'Beginner',
    summary:
      'Get comfortable with core tax ideas including government revenue, tax systems, and how taxes affect personal and economic decisions.',
    highlights: ['Tax basics', 'Tax systems', 'Economic impact'],
  }),
  createCourse({
    id: 'khan-core-accounting-statements',
    title: 'Accounting and Financial Statements',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/economics-finance-domain/core-finance/accounting-and-financial-stateme',
    category: 'Finance Theory',
    level: 'Beginner',
    summary:
      'A practical introduction to balance sheets, income statements, and cash flow so you can read company financials with confidence.',
    highlights: ['Income statement', 'Balance sheet', 'Cash flow'],
    thumbnailTitle: 'Accounting',
    thumbnailSubtitle: 'Read financial statements better',
  }),
  createCourse({
    id: 'khan-core-stocks-bonds',
    title: 'Stocks and Bonds',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/economics-finance-domain/core-finance/stock-and-bonds',
    category: 'Stocks',
    level: 'Beginner',
    summary:
      'Learn how companies raise capital, how stock ownership works, and how bonds differ from equity in real-world markets.',
    highlights: ['Equity vs debt', 'Market capitalization', 'Short selling'],
    thumbnailTitle: 'Stocks & Bonds',
    thumbnailSubtitle: 'Ownership, debt, and market value',
  }),
  createCourse({
    id: 'khan-core-investment-vehicles',
    title: 'Investment Vehicles, Insurance, and Retirement',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/economics-finance-domain/core-finance/investment-vehicles-insurance-and-retirement',
    category: 'Investing',
    level: 'Beginner',
    summary:
      'Explore investment products, retirement planning, and the protection role that insurance can play in long-term wealth building.',
    highlights: ['Retirement basics', 'Investment products', 'Insurance'],
    thumbnailTitle: 'Investment Vehicles',
    thumbnailSubtitle: 'Investments, retirement, and protection',
  }),
  createCourse({
    id: 'khan-core-money-banking',
    title: 'Money, Banking, and Central Banks',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/economics-finance-domain/core-finance/money-and-banking',
    category: 'Markets',
    level: 'Intermediate',
    summary:
      'Understand the banking system, money creation, central bank policy, and how these forces influence financial markets.',
    highlights: ['Central banks', 'Money supply', 'Banking system'],
    thumbnailTitle: 'Money & Banking',
    thumbnailSubtitle: 'Banks, policy, and money creation',
    thumbnailTheme: 'cyan',
  }),
  createCourse({
    id: 'khan-core-derivatives',
    title: 'Derivative Securities',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/economics-finance-domain/core-finance/derivative-securities',
    category: 'Finance Theory',
    level: 'Intermediate',
    summary:
      'Get introduced to options, derivatives, and the logic of financial instruments used for hedging and speculation.',
    highlights: ['Options basics', 'Payoff structures', 'Hedging'],
    thumbnailTitle: 'Derivatives',
    thumbnailSubtitle: 'Options and structured payoffs',
  }),
  createCourse({
    id: 'khan-core-current-economics',
    title: 'Current Economics',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/economics-finance-domain/core-finance/current-economics',
    category: 'Markets',
    level: 'Intermediate',
    summary:
      'Connect finance concepts with real economic themes and contemporary market topics affecting households and investors.',
    highlights: ['Economic context', 'Policy effects', 'Market relevance'],
  }),
  createCourse({
    id: 'khan-pf-overview',
    title: 'Personal Finance',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/college-careers-more/personal-finance',
    category: 'Personal Finance',
    level: 'Beginner',
    summary:
      'A broad personal finance course covering budgeting, debt, taxes, housing, education costs, and other real-life money decisions.',
    highlights: ['Budgeting', 'Debt', 'Taxes'],
    thumbnailTitle: 'Personal Finance',
    thumbnailSubtitle: 'Everyday money decisions',
  }),
  createCourse({
    id: 'khan-pf-saving-budgeting',
    title: 'Saving and Budgeting',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/college-careers-more/personal-finance/pf-saving-and-budgeting',
    category: 'Personal Finance',
    level: 'Beginner',
    summary:
      'Learn how to budget, build emergency savings, and create sustainable cash-flow habits before moving into investing.',
    highlights: ['Budgeting', 'Emergency fund', 'Cash flow'],
    thumbnailTitle: 'Saving & Budgeting',
    thumbnailSubtitle: 'Build strong money habits first',
  }),
  createCourse({
    id: 'khan-pf-interest-debt',
    title: 'Personal Finance: Interest and Debt',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/college-careers-more/personal-finance/pf-interest-and-debt',
    category: 'Personal Finance',
    level: 'Beginner',
    summary:
      'Focus on how loans, debt, and interest affect your financial life, from minimum payments to the cost of borrowing.',
    highlights: ['Debt management', 'Interest cost', 'Loan mechanics'],
  }),
  createCourse({
    id: 'khan-pf-investments-retirement',
    title: 'Personal Finance: Investments and Retirement',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/college-careers-more/personal-finance/pf-investment-vehicles-insurance-and-retirement',
    category: 'Investing',
    level: 'Beginner',
    summary:
      'A beginner-friendly path through investing basics, retirement accounts, risk, diversification, and long-term wealth building.',
    highlights: ['Saving vs investing', 'Retirement planning', 'Investment basics'],
    thumbnailTitle: 'Investing',
    thumbnailSubtitle: 'Grow wealth with long-term basics',
  }),
  createCourse({
    id: 'khan-pf-income-benefits',
    title: 'Income and Benefits',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/college-careers-more/personal-finance/pf-income-and-benefits',
    category: 'Personal Finance',
    level: 'Beginner',
    summary:
      'Understand paychecks, compensation, employment income, and the role of benefits in personal financial planning.',
    highlights: ['Paychecks', 'Compensation', 'Benefits'],
  }),
  createCourse({
    id: 'khan-pf-housing',
    title: 'Personal Finance: Housing',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/college-careers-more/personal-finance/pf-housing',
    category: 'Personal Finance',
    level: 'Beginner',
    summary:
      'Learn how to think about housing costs, monthly affordability, and the financial tradeoffs of different living choices.',
    highlights: ['Affordability', 'Renting', 'Home costs'],
  }),
  createCourse({
    id: 'khan-pf-car-expenses',
    title: 'Car Expenses',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/college-careers-more/personal-finance/pf-car-expenses',
    category: 'Personal Finance',
    level: 'Beginner',
    summary:
      'See the full financial picture of owning a vehicle, including loans, depreciation, insurance, and maintenance.',
    highlights: ['Car loans', 'Depreciation', 'Ownership costs'],
  }),
  createCourse({
    id: 'khan-pf-taxes',
    title: 'Personal Finance: Taxes',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/college-careers-more/personal-finance/pf-taxes',
    category: 'Personal Finance',
    level: 'Beginner',
    summary:
      'Learn the personal side of taxes, including filing basics, tax rules, and how taxes affect planning decisions.',
    highlights: ['Filing basics', 'Tax planning', 'Tax rules'],
  }),
  createCourse({
    id: 'khan-pf-college',
    title: 'Paying for College',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/college-careers-more/personal-finance/pf-paying-for-college',
    category: 'Personal Finance',
    level: 'Beginner',
    summary:
      'Compare education costs, financial aid, and borrowing choices so you can think more clearly about college financing.',
    highlights: ['Education costs', 'Financial aid', 'Student borrowing'],
  }),
  createCourse({
    id: 'khan-pf-information-safety',
    title: 'Keeping Your Information Safe',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/college-careers-more/personal-finance/pf-keeping-your-information-safe',
    category: 'Personal Finance',
    level: 'Beginner',
    summary:
      'Protect your finances by learning the basics of fraud prevention, privacy, identity safety, and secure financial behavior.',
    highlights: ['Identity safety', 'Fraud prevention', 'Privacy'],
  }),
  createCourse({
    id: 'khan-fl-overview',
    title: 'Financial Literacy',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/college-careers-more/financial-literacy',
    category: 'Personal Finance',
    level: 'Beginner',
    summary:
      'A broad free course that spans saving, credit, investing, taxes, employment, housing, banking, and more.',
    highlights: ['Budgeting', 'Credit', 'Banking'],
    thumbnailTitle: 'Financial Literacy',
    thumbnailSubtitle: 'Broad finance foundations',
    thumbnailTheme: 'emerald',
  }),
  createCourse({
    id: 'khan-fl-budgeting-saving',
    title: 'Financial Literacy: Budgeting and Saving',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/college-careers-more/financial-literacy/xa6995ea67a8e9fdd:budgeting-and-saving',
    category: 'Personal Finance',
    level: 'Beginner',
    summary:
      'A focused unit on building budgets, setting aside savings, and understanding how money habits affect long-term stability.',
    highlights: ['Budgets', 'Saving systems', 'Spending discipline'],
  }),
  createCourse({
    id: 'khan-fl-consumer-credit',
    title: 'Financial Literacy: Consumer Credit',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/college-careers-more/financial-literacy/xa6995ea67a8e9fdd:consumer-credit',
    category: 'Personal Finance',
    level: 'Beginner',
    summary:
      'Understand credit usage, credit scores, credit reports, and the tradeoffs involved in borrowing as a consumer.',
    highlights: ['Credit scores', 'Credit reports', 'Borrowing'],
  }),
  createCourse({
    id: 'khan-fl-financial-goals',
    title: 'Financial Literacy: Financial Goals',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/college-careers-more/financial-literacy/xa6995ea67a8e9fdd:financial-goals',
    category: 'Personal Finance',
    level: 'Beginner',
    summary:
      'Turn abstract money ambitions into concrete goals with timelines, tradeoffs, and practical planning frameworks.',
    highlights: ['Goal setting', 'Planning', 'Tradeoffs'],
  }),
  createCourse({
    id: 'khan-fl-insurance',
    title: 'Financial Literacy: Insurance',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/college-careers-more/financial-literacy/xa6995ea67a8e9fdd:insurance',
    category: 'Personal Finance',
    level: 'Beginner',
    summary:
      'Learn why insurance exists, how risk pooling works, and what different insurance decisions mean for personal finances.',
    highlights: ['Risk transfer', 'Insurance basics', 'Coverage choices'],
  }),
  createCourse({
    id: 'khan-fl-investments-retirement',
    title: 'Financial Literacy: Investments and Retirement',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/college-careers-more/financial-literacy/xa6995ea67a8e9fdd:investments-retirement',
    category: 'Investing',
    level: 'Beginner',
    summary:
      'A practical investing unit that covers why people invest, how retirement planning works, and how to think about long-term returns.',
    highlights: ['Retirement', 'Investment basics', 'Long-term planning'],
  }),
  createCourse({
    id: 'khan-fl-careers-education',
    title: 'Financial Literacy: Careers and Education',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/college-careers-more/financial-literacy/xa6995ea67a8e9fdd:careers-and-education',
    category: 'Personal Finance',
    level: 'Beginner',
    summary:
      'Connect education and career choices to future earnings, opportunity cost, and long-term financial outcomes.',
    highlights: ['Career planning', 'Education choices', 'Earning power'],
  }),
  createCourse({
    id: 'khan-fl-taxes-forms',
    title: 'Financial Literacy: Taxes and Tax Forms',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/college-careers-more/financial-literacy/xa6995ea67a8e9fdd:taxes-and-tax-forms',
    category: 'Personal Finance',
    level: 'Beginner',
    summary:
      'Get comfortable with common tax forms, tax language, and the core ideas behind paying and reporting taxes.',
    highlights: ['Tax forms', 'Filing basics', 'Tax language'],
  }),
  createCourse({
    id: 'khan-fl-employment',
    title: 'Financial Literacy: Employment',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/college-careers-more/financial-literacy/xa6995ea67a8e9fdd:employment',
    category: 'Personal Finance',
    level: 'Beginner',
    summary:
      'Learn how employment choices, workplace basics, and compensation structures tie back to personal financial health.',
    highlights: ['Workplace basics', 'Compensation', 'Job decisions'],
  }),
  createCourse({
    id: 'khan-fl-banking',
    title: 'Financial Literacy: Banking',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/college-careers-more/financial-literacy/xa6995ea67a8e9fdd:banking',
    category: 'Personal Finance',
    level: 'Beginner',
    summary:
      'Understand checking, savings, financial institutions, and the practical banking tools used in day-to-day money management.',
    highlights: ['Checking accounts', 'Savings accounts', 'Bank services'],
  }),
  createCourse({
    id: 'khan-fl-housing',
    title: 'Financial Literacy: Housing',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/college-careers-more/financial-literacy/xa6995ea67a8e9fdd:housing24',
    category: 'Personal Finance',
    level: 'Beginner',
    summary:
      'A housing-focused financial literacy unit on affordability, housing tradeoffs, and real-world budgeting decisions.',
    highlights: ['Housing tradeoffs', 'Affordability', 'Cost planning'],
  }),
  createCourse({
    id: 'khan-fl-car-buying',
    title: 'Financial Literacy: Car Buying',
    provider: 'Khan Academy',
    url: 'https://www.khanacademy.org/college-careers-more/financial-literacy/xa6995ea67a8e9fdd:car-buying',
    category: 'Personal Finance',
    level: 'Beginner',
    summary:
      'Learn how to evaluate the true cost of a car purchase, from financing and depreciation to maintenance and insurance.',
    highlights: ['Car purchase math', 'Loan tradeoffs', 'Ownership planning'],
  }),
  createCourse({
    id: 'mit-finance-theory-i',
    title: 'Finance Theory I',
    provider: 'MIT OpenCourseWare',
    url: 'https://ocw.mit.edu/courses/15-401-finance-theory-i-fall-2008/',
    category: 'Finance Theory',
    level: 'Intermediate',
    summary:
      'A university-level course on capital markets, investments, asset valuation, capital budgeting, efficient markets, and derivatives.',
    highlights: ['Asset valuation', 'Portfolio selection', 'Efficient markets'],
    thumbnailTitle: 'Finance Theory I',
    thumbnailSubtitle: 'MIT capital markets and valuation',
  }),
  createCourse({
    id: 'mit-finance-theory-ii',
    title: 'Finance Theory II',
    provider: 'MIT OpenCourseWare',
    url: 'https://ocw.mit.edu/courses/15-402-finance-theory-ii-spring-2003/',
    category: 'Finance Theory',
    level: 'Advanced',
    summary:
      'Continue into deeper corporate finance, asset pricing, and advanced finance theory with a more rigorous academic treatment.',
    highlights: ['Corporate finance', 'Advanced valuation', 'Theory depth'],
    thumbnailTitle: 'Finance Theory II',
    thumbnailSubtitle: 'Advanced MIT finance theory',
  }),
  createCourse({
    id: 'mit-consumer-finance',
    title: 'Consumer Finance: Markets, Product Design, and FinTech',
    provider: 'MIT OpenCourseWare',
    url: 'https://ocw.mit.edu/courses/15-483-consumer-finance-markets-product-design-and-fintech-spring-2018/',
    category: 'Personal Finance',
    level: 'Intermediate',
    summary:
      'Explore retirement products, credit cards, peer-to-peer lending, crypto, and the product design side of modern consumer finance.',
    highlights: ['FinTech', 'Credit markets', 'Consumer decision-making'],
    thumbnailTitle: 'Consumer Finance',
    thumbnailSubtitle: 'FinTech, lending, and product design',
    thumbnailTheme: 'cyan',
  }),
  createCourse({
    id: 'mit-practice-finance',
    title: 'Practice of Finance: Advanced Corporate Risk Management',
    provider: 'MIT OpenCourseWare',
    url: 'https://ocw.mit.edu/courses/15-997-practice-of-finance-advanced-corporate-risk-management-spring-2009/',
    category: 'Markets',
    level: 'Advanced',
    summary:
      'A more advanced finance course focused on corporate risk management, practical finance, and the business side of managing uncertainty.',
    highlights: ['Risk management', 'Corporate finance', 'Applied finance'],
    thumbnailTitle: 'Practice of Finance',
    thumbnailSubtitle: 'Advanced risk and corporate finance',
  }),
  createCourse({
    id: 'yale-financial-markets',
    title: 'Financial Markets',
    provider: 'Open Yale Courses',
    url: 'https://oyc.yale.edu/economics/econ-252',
    category: 'Markets',
    level: 'Intermediate',
    summary:
      'Robert Shiller’s classic course covering risk management, behavioral finance, securities, insurance, banking, options, and markets.',
    highlights: ['Behavioral finance', 'Risk management', 'Options and banks'],
    thumbnailTitle: 'Financial Markets',
    thumbnailSubtitle: 'Shiller on risk, crises, and markets',
  }),
  createCourse({
    id: 'yale-financial-theory',
    title: 'Financial Theory',
    provider: 'Open Yale Courses',
    url: 'https://oyc.yale.edu/economics/econ-251',
    category: 'Finance Theory',
    level: 'Advanced',
    summary:
      'A deeper theory-driven course on financial equilibrium, valuation, arbitrage, and the logic behind how financial systems work.',
    highlights: ['Arbitrage', 'Financial equilibrium', 'Valuation theory'],
    thumbnailTitle: 'Financial Theory',
    thumbnailSubtitle: 'Valuation, equilibrium, and arbitrage',
  }),
];

export const learningCategories: Array<{ label: string; value: LearningCategory | 'All' }> = [
  { label: 'All Topics', value: 'All' },
  { label: 'Stocks', value: 'Stocks' },
  { label: 'Investing', value: 'Investing' },
  { label: 'Personal Finance', value: 'Personal Finance' },
  { label: 'Markets', value: 'Markets' },
  { label: 'Finance Theory', value: 'Finance Theory' },
];
