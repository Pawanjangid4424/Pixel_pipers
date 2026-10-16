// Small building-block types used by lib/types/index.ts and the content files
export type NavLinkType = {
  name: string;
  url: string;
};

export type User = {
  _id: string;
  first_name: string;
  last_name: string;
  username: string;
  picture: string;
  email: string;
};

export type RegisterValue = {
  _id: string;
  id: string;
  icon: string;
  name: string;
  type: string;
  label: string;
};

export type Token = {
  refresh: string;
  access: string;
};
