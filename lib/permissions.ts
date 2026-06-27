export const ROLES = [
  'System Administrator',
  'Sponsor Admin',
  'TMF Lead',
  'Clinical Trial Manager',
  'Clinical Trial Associate',
  'CRA',
  'Regulatory',
  'Quality Assurance',
  'Medical Monitor',
  'Site Coordinator',
  'Investigator',
  'Auditor',
  'Inspector',
] as const;

export type Role = typeof ROLES[number];

export const PERMISSIONS = {
  // Document permissions
  upload_document:     ['System Administrator','Sponsor Admin','TMF Lead','Clinical Trial Manager','Clinical Trial Associate','CRA','Regulatory','Quality Assurance','Site Coordinator','Investigator'],
  submit_document:     ['System Administrator','Sponsor Admin','TMF Lead','Clinical Trial Manager','Clinical Trial Associate','CRA','Regulatory','Quality Assurance','Site Coordinator','Investigator'],
  review_document:     ['System Administrator','Sponsor Admin','TMF Lead','Clinical Trial Manager','Regulatory','Quality Assurance'],
  approve_document:    ['System Administrator','Sponsor Admin','TMF Lead','Regulatory','Quality Assurance'],
  reject_document:     ['System Administrator','Sponsor Admin','TMF Lead','Regulatory','Quality Assurance'],
  delete_document:     ['System Administrator','Sponsor Admin','TMF Lead'],
  view_document:       ['System Administrator','Sponsor Admin','TMF Lead','Clinical Trial Manager','Clinical Trial Associate','CRA','Regulatory','Quality Assurance','Medical Monitor','Site Coordinator','Investigator','Auditor','Inspector'],

  // Study permissions
  create_study:        ['System Administrator','Sponsor Admin','TMF Lead','Clinical Trial Manager'],
  edit_study:          ['System Administrator','Sponsor Admin','TMF Lead','Clinical Trial Manager'],
  view_study:          ['System Administrator','Sponsor Admin','TMF Lead','Clinical Trial Manager','Clinical Trial Associate','CRA','Regulatory','Quality Assurance','Medical Monitor','Site Coordinator','Investigator','Auditor','Inspector'],

  // User management
  invite_users:        ['System Administrator','Sponsor Admin','TMF Lead'],
  manage_roles:        ['System Administrator','Sponsor Admin'],
  view_audit_trail:    ['System Administrator','Sponsor Admin','TMF Lead','Regulatory','Quality Assurance','Auditor','Inspector'],

  // Quality & compliance
  run_quality_checks:  ['System Administrator','Sponsor Admin','TMF Lead','Quality Assurance'],
  view_gap_analysis:   ['System Administrator','Sponsor Admin','TMF Lead','Clinical Trial Manager','CRA','Regulatory','Quality Assurance','Auditor','Inspector'],
  export_inspection:   ['System Administrator','Sponsor Admin','TMF Lead','Regulatory','Auditor','Inspector'],
} as const;

export type Permission = keyof typeof PERMISSIONS;

export function hasPermission(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

export function getRoleColor(role: Role | string): string {
  const colors: Record<string, string> = {
    'System Administrator': '#6366F1',
    'Sponsor Admin':        '#8B5CF6',
    'TMF Lead':             '#10B981',
    'Clinical Trial Manager':'#3B82F6',
    'Clinical Trial Associate':'#06B6D4',
    'CRA':                  '#F59E0B',
    'Regulatory':           '#EF4444',
    'Quality Assurance':    '#EC4899',
    'Medical Monitor':      '#14B8A6',
    'Site Coordinator':     '#84CC16',
    'Investigator':         '#F97316',
    'Auditor':              '#6B7280',
    'Inspector':            '#DC2626',
  };
  return colors[role] || '#6366F1';
}

export function getRoleBg(role: Role | string): string {
  const bgs: Record<string, string> = {
    'System Administrator': '#EEF2FF',
    'Sponsor Admin':        '#F5F3FF',
    'TMF Lead':             '#ECFDF5',
    'Clinical Trial Manager':'#EFF6FF',
    'Clinical Trial Associate':'#ECFEFF',
    'CRA':                  '#FFFBEB',
    'Regulatory':           '#FEF2F2',
    'Quality Assurance':    '#FDF2F8',
    'Medical Monitor':      '#F0FDFA',
    'Site Coordinator':     '#F7FEE7',
    'Investigator':         '#FFF7ED',
    'Auditor':              '#F9FAFB',
    'Inspector':            '#FEF2F2',
  };
  return bgs[role] || '#EEF2FF';
}