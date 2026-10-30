/// <reference path="../pb_data/types.d.ts" />

/**
 * "Sign up with Google". Browsers cannot create users (users.createRule is null), so PocketBase
 * would refuse a first Google sign-in. Here the server makes that account itself, unpaid
 * ("pending") with a verified email and an unknown random password, and PocketBase then links the
 * Google identity to it as for any existing user. The web app's /api/accounts/google adds the
 * author site and payment step. A Google email that already has an account signs in to it.
 */
onRecordAuthWithOAuth2Request((e) => {
  if (!e.record && e.oAuth2User && e.oAuth2User.email) {
    const record = new Record(e.collection);
    record.setEmail(e.oAuth2User.email);
    record.set("name", String(e.oAuth2User.name || "").slice(0, 120));
    record.set("emailVisibility", false);
    record.set("access", "pending");
    record.setRandomPassword();
    record.setVerified(true);
    e.app.save(record);
    e.record = record;
  }
  e.next();
}, "users");
