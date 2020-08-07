const ACL_PREFIX = 'http://www.w3.org/ns/auth/acl#';
const FOAF_PREFIX = 'http://xmlns.com/foaf/0.1/';

export const ACL = {
  accessTo: `${ACL_PREFIX}accessTo`,
  agent: `${ACL_PREFIX}agent`,
  agentClass: `${ACL_PREFIX}agentClass`,
  default: `${ACL_PREFIX}default`,
  mode: `${ACL_PREFIX}mode`,

  Write: `${ACL_PREFIX}Write`,
  Read: `${ACL_PREFIX}Read`,
  Append: `${ACL_PREFIX}Append`,
  Control: `${ACL_PREFIX}Control`,
};

export const FOAF = {
  Agent: `${FOAF_PREFIX}Agent`,
  AuthenticatedAgent: `${FOAF_PREFIX}AuthenticatedAgent`,
};
