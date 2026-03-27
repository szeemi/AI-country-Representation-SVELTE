export const DATA = [
	{ country: 'Sweden',      actual: 5635.2,  expected: 1059.1, ratio: 5.321, cat: 'over',   companies: 53  },
	{ country: 'Netherlands', actual: 6211.9,  expected: 2129.7, ratio: 2.917, cat: 'over',   companies: 72  },
	{ country: 'Estonia',     actual: 139.7,   expected: 77.5,   ratio: 1.803, cat: 'over',   companies: 25  },
	{ country: 'Germany',     actual: 11479.4, expected: 8223.7, ratio: 1.396, cat: 'over',   companies: 192 },
	{ country: 'France',      actual: 6011.7,  expected: 5431.7, ratio: 1.107, cat: 'inline', companies: 125 },
	{ country: 'Portugal',    actual: 392.2,   expected: 526.1,  ratio: 0.745, cat: 'inline', companies: 25  },
	{ country: 'Cyprus',      actual: 44.6,    expected: 69.2,   ratio: 0.645, cat: 'under',  companies: 4   },
	{ country: 'Finland',     actual: 308.4,   expected: 501.6,  ratio: 0.615, cat: 'under',  companies: 23  },
	{ country: 'Lithuania',   actual: 87.0,    expected: 150.2,  ratio: 0.58,  cat: 'under',  companies: 10  },
	{ country: 'Spain',       actual: 1571.3,  expected: 2931.8, ratio: 0.536, cat: 'under',  companies: 65  },
	{ country: 'Ireland',     actual: 561.2,   expected: 1091.8, ratio: 0.514, cat: 'under',  companies: 33  },
	{ country: 'Denmark',     actual: 296.3,   expected: 734.7,  ratio: 0.403, cat: 'under',  companies: 30  },
	{ country: 'Czech R.',    actual: 168.9,   expected: 623.2,  ratio: 0.271, cat: 'under',  companies: 19  },
	{ country: 'Belgium',     actual: 254.6,   expected: 1139.6, ratio: 0.223, cat: 'under',  companies: 26  },
	{ country: 'Romania',     actual: 144.2,   expected: 700.4,  ratio: 0.206, cat: 'under',  companies: 12  },
	{ country: 'Italy',       actual: 580.6,   expected: 4140.6, ratio: 0.14,  cat: 'under',  companies: 69  },
	{ country: 'Greece',      actual: 51.0,    expected: 468.3,  ratio: 0.109, cat: 'under',  companies: 6   },
	{ country: 'Austria',     actual: 86.7,    expected: 912.9,  ratio: 0.095, cat: 'under',  companies: 18  },
	{ country: 'Slovakia',    actual: 17.9,    expected: 255.1,  ratio: 0.07,  cat: 'under',  companies: 5   },
	{ country: 'Slovenia',    actual: 8.5,     expected: 126.9,  ratio: 0.067, cat: 'under',  companies: 1   },
	{ country: 'Hungary',     actual: 13.3,    expected: 408.7,  ratio: 0.033, cat: 'under',  companies: 6   },
	{ country: 'Luxembourg',  actual: 4.6,     expected: 159.9,  ratio: 0.029, cat: 'under',  companies: 5   },
	{ country: 'Poland',      actual: 50.1,    expected: 1760.0, ratio: 0.028, cat: 'under',  companies: 28  },
	{ country: 'Latvia',      actual: 1.7,     expected: 75.0,   ratio: 0.023, cat: 'under',  companies: 4   },
	{ country: 'Croatia',     actual: 3.0,     expected: 171.0,  ratio: 0.018, cat: 'under',  companies: 4   },
	{ country: 'Malta',       actual: 0.4,     expected: 43.3,   ratio: 0.01,  cat: 'under',  companies: 2   },
	{ country: 'Bulgaria',    actual: 0.0,     expected: 212.6,  ratio: 0.0,   cat: 'under',  companies: 1   },
];

export const CAT_CFG = {
	over:   { fill: '#fdf151', text: '#333333', label: 'Over Represented'  },
	inline: { fill: '#c8c8c8', text: '#333333', label: 'In Line'           },
	under:  { fill: '#333333', text: '#ffffff', label: 'Under Represented' },
};

export const ABBREV = {
	Netherlands: 'Nether.', Lithuania: 'Lithuan.', Luxembourg: 'Luxemb.',
	Portugal: 'Portug.', Slovakia: 'Slovak.', Slovenia: 'Sloven.',
	Bulgaria: 'Bulgar.', 'Czech R.': 'Czech R.',
};
