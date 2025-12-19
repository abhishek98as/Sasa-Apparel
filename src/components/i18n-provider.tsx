'use client';

import { createContext, useContext, useMemo, useState, useEffect, ReactNode } from 'react';

type Locale = 'en' | 'hi';

type Messages = Record<string, string>;

const dictionary: Record<Locale, Messages> = {
  en: {
    // Auth
    'welcome.back': 'Welcome back',
    'sign.in': 'Sign in to your account',
    'email': 'Email address',
    'password': 'Password',
    'sign.out': 'Sign out',
    'login': 'Login',
    'logging.in': 'Logging in...',
    'change.password': 'Change Password',
    'current.password': 'Current Password',
    'new.password': 'New Password',
    'confirm.password': 'Confirm Password',

    // Navigation
    'dashboard': 'Dashboard',
    'vendors': 'Vendors',
    'tailors': 'Tailors',
    'styles': 'Styles',
    'fabric.cutting': 'Fabric Cutting',
    'tailor.jobs': 'Tailor Jobs',
    'shipments': 'Shipments',
    'rates': 'Rates',
    'users': 'Users',
    'inventory': 'Inventory',
    'quality.control': 'Quality Control',
    'payments': 'Payments',
    'approvals': 'Approvals',
    'my.jobs': 'My Jobs',

    // Roles
    'admin': 'Administrator',
    'manager': 'Manager Portal',
    'vendor': 'Vendor Portal',
    'tailor': 'Tailor Portal',

    // Common Actions
    'add': 'Add',
    'edit': 'Edit',
    'delete': 'Delete',
    'save': 'Save',
    'cancel': 'Cancel',
    'submit': 'Submit',
    'search': 'Search',
    'filter': 'Filter',
    'export': 'Export',
    'view': 'View',
    'close': 'Close',
    'approve': 'Approve',
    'reject': 'Reject',
    'clear': 'Clear',
    'update': 'Update',
    'create': 'Create',
    'refresh': 'Refresh',

    // Status
    'status': 'Status',
    'active': 'Active',
    'inactive': 'Inactive',
    'pending': 'Pending',
    'approved': 'Approved',
    'rejected': 'Rejected',
    'completed': 'Completed',
    'in.progress': 'In Progress',
    'passed': 'Passed',
    'failed': 'Failed',
    'rework': 'Rework',

    // Dashboard
    'total.vendors': 'Total Vendors',
    'total.tailors': 'Total Tailors',
    'total.styles': 'Total Styles',
    'pending.jobs': 'Pending Jobs',
    'completed.jobs': 'Completed Jobs',
    'recent.activity': 'Recent Activity',
    'production.overview': 'Production Overview',
    'date.range': 'Date Range',
    'today': 'Today',
    'last.7.days': 'Last 7 Days',
    'this.month': 'This Month',
    'this.year': 'This Year',
    'all.time': 'All Time',
    'from': 'From',
    'to': 'To',

    // Inventory
    'inventory.items': 'Inventory Items',
    'stock.movements': 'Stock Movements',
    'reorder.suggestions': 'Reorder Suggestions',
    'low.stock': 'Low Stock',
    'raw.material': 'Raw Material',
    'accessory': 'Accessory',
    'stock.in': 'Stock In',
    'stock.out': 'Stock Out',
    'wastage': 'Wastage',
    'adjustment': 'Adjustment',
    'min.stock': 'Min Stock',
    'current.stock': 'Current Stock',
    'cost.per.unit': 'Cost Per Unit',

    // QC
    'qc.checklist': 'QC Checklist',
    'qc.inspection': 'QC Inspection',
    'defects': 'Defects',
    'stitching': 'Stitching',
    'fabric': 'Fabric',
    'measurement': 'Measurement',
    'severity': 'Severity',
    'critical': 'Critical',
    'rejection.reason': 'Rejection Reason',
    'rework.assigned': 'Rework Assigned',

    // Payments
    'earning': 'Earning',
    'payout': 'Payout',
    'advance': 'Advance',
    'deduction': 'Deduction',
    'balance': 'Balance',
    'outstanding': 'Outstanding',
    'payment.history': 'Payment History',

    // Tailor specific
    'pieces.completed': 'Pieces Completed',
    'earnings.this.month': 'Earnings This Month',
    'pending.work': 'Pending Work',
    'work.update': 'Work Update',

    // Common labels
    'name': 'Name',
    'phone': 'Phone',
    'address': 'Address',
    'description': 'Description',
    'quantity': 'Quantity',
    'amount': 'Amount',
    'date': 'Date',
    'type': 'Type',
    'category': 'Category',
    'notes': 'Notes',
    'actions': 'Actions',
    'total': 'Total',
    'details': 'Details',
    'remarks': 'Remarks',
    'no.data': 'No data found',
    'loading': 'Loading...',
    'error.occurred': 'An error occurred',
    'success': 'Success',
  },
  hi: {
    // Auth
    'welcome.back': 'वापसी पर स्वागत है',
    'sign.in': 'अपने खाते में साइन इन करें',
    'email': 'ईमेल पता',
    'password': 'पासवर्ड',
    'sign.out': 'साइन आउट',
    'login': 'लॉगिन',
    'logging.in': 'लॉग इन हो रहा है...',
    'change.password': 'पासवर्ड बदलें',
    'current.password': 'वर्तमान पासवर्ड',
    'new.password': 'नया पासवर्ड',
    'confirm.password': 'पासवर्ड की पुष्टि करें',

    // Navigation
    'dashboard': 'डैशबोर्ड',
    'vendors': 'विक्रेता',
    'tailors': 'दर्जी',
    'styles': 'शैलियाँ',
    'fabric.cutting': 'कपड़ा कटाई',
    'tailor.jobs': 'दर्जी कार्य',
    'shipments': 'शिपमेंट',
    'rates': 'दरें',
    'users': 'उपयोगकर्ता',
    'inventory': 'इन्वेंटरी',
    'quality.control': 'गुणवत्ता नियंत्रण',
    'payments': 'भुगतान',
    'approvals': 'अनुमोदन',
    'my.jobs': 'मेरे कार्य',

    // Roles
    'admin': 'व्यवस्थापक',
    'manager': 'प्रबंधक पोर्टल',
    'vendor': 'विक्रेता पोर्टल',
    'tailor': 'दर्जी पोर्टल',

    // Common Actions
    'add': 'जोड़ें',
    'edit': 'संपादित करें',
    'delete': 'हटाएं',
    'save': 'सहेजें',
    'cancel': 'रद्द करें',
    'submit': 'जमा करें',
    'search': 'खोजें',
    'filter': 'फ़िल्टर',
    'export': 'निर्यात',
    'view': 'देखें',
    'close': 'बंद करें',
    'approve': 'स्वीकृत करें',
    'reject': 'अस्वीकार करें',
    'clear': 'साफ करें',
    'update': 'अपडेट करें',
    'create': 'बनाएं',
    'refresh': 'रिफ्रेश',

    // Status
    'status': 'स्थिति',
    'active': 'सक्रिय',
    'inactive': 'निष्क्रिय',
    'pending': 'लंबित',
    'approved': 'स्वीकृत',
    'rejected': 'अस्वीकृत',
    'completed': 'पूर्ण',
    'in.progress': 'प्रगति में',
    'passed': 'उत्तीर्ण',
    'failed': 'असफल',
    'rework': 'पुनः कार्य',

    // Dashboard
    'total.vendors': 'कुल विक्रेता',
    'total.tailors': 'कुल दर्जी',
    'total.styles': 'कुल शैलियाँ',
    'pending.jobs': 'लंबित कार्य',
    'completed.jobs': 'पूर्ण कार्य',
    'recent.activity': 'हाल की गतिविधि',
    'production.overview': 'उत्पादन अवलोकन',
    'date.range': 'तारीख सीमा',
    'today': 'आज',
    'last.7.days': 'पिछले 7 दिन',
    'this.month': 'इस महीने',
    'this.year': 'इस साल',
    'all.time': 'सभी समय',
    'from': 'से',
    'to': 'तक',

    // Inventory
    'inventory.items': 'इन्वेंटरी आइटम',
    'stock.movements': 'स्टॉक गतिविधि',
    'reorder.suggestions': 'पुनः ऑर्डर सुझाव',
    'low.stock': 'कम स्टॉक',
    'raw.material': 'कच्चा माल',
    'accessory': 'सहायक उपकरण',
    'stock.in': 'स्टॉक इन',
    'stock.out': 'स्टॉक आउट',
    'wastage': 'बर्बादी',
    'adjustment': 'समायोजन',
    'min.stock': 'न्यूनतम स्टॉक',
    'current.stock': 'वर्तमान स्टॉक',
    'cost.per.unit': 'प्रति इकाई लागत',

    // QC
    'qc.checklist': 'क्यूसी चेकलिस्ट',
    'qc.inspection': 'क्यूसी निरीक्षण',
    'defects': 'दोष',
    'stitching': 'सिलाई',
    'fabric': 'कपड़ा',
    'measurement': 'माप',
    'severity': 'गंभीरता',
    'critical': 'गंभीर',
    'rejection.reason': 'अस्वीकृति कारण',
    'rework.assigned': 'पुनः कार्य सौंपा गया',

    // Payments
    'earning': 'कमाई',
    'payout': 'भुगतान',
    'advance': 'अग्रिम',
    'deduction': 'कटौती',
    'balance': 'शेष राशि',
    'outstanding': 'बकाया',
    'payment.history': 'भुगतान इतिहास',

    // Tailor specific
    'pieces.completed': 'पूर्ण टुकड़े',
    'earnings.this.month': 'इस महीने की कमाई',
    'pending.work': 'लंबित कार्य',
    'work.update': 'कार्य अपडेट',

    // Common labels
    'name': 'नाम',
    'phone': 'फोन',
    'address': 'पता',
    'description': 'विवरण',
    'quantity': 'मात्रा',
    'amount': 'राशि',
    'date': 'तारीख',
    'type': 'प्रकार',
    'category': 'श्रेणी',
    'notes': 'टिप्पणी',
    'actions': 'कार्रवाई',
    'total': 'कुल',
    'details': 'विवरण',
    'remarks': 'टिप्पणी',
    'no.data': 'कोई डेटा नहीं मिला',
    'loading': 'लोड हो रहा है...',
    'error.occurred': 'एक त्रुटि हुई',
    'success': 'सफलता',
  },
};

interface I18nContextType {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('en');

  useEffect(() => {
    const saved = localStorage.getItem('locale');
    if (saved === 'hi' || saved === 'en') {
      setLocaleState(saved);
    }
  }, []);

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem('locale', newLocale);
  };

  const t = (key: string) => {
    const messages = dictionary[locale] || dictionary.en;
    return messages[key] || dictionary.en[key] || key;
  };

  const value = useMemo(() => ({ locale, setLocale, t }), [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return ctx;
}
