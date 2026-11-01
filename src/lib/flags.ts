/** Site-wide switches, kept in the app_flags collection and flipped in Admin > Switches. */
export const FLAGS = {
  free_domains: {
    label: "Free .com with yearly Pro",
    about:
      "Authors on the $96 yearly plan can claim a .com for their first year. Each one costs about $13 from your Name.com balance.",
    before:
      "Before switching on: add about $50 credit at name.com/account/credit, so there is money to buy the domains.",
    reminder: "Free .com is off: add $50 Name.com credit, then switch it on",
  },
} as const;

export type FlagKey = keyof typeof FLAGS;
export type Flags = Record<FlagKey, boolean>;
