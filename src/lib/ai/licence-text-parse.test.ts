import assert from "node:assert/strict";
import { test } from "node:test";
import { addYearsToIsoDate, mergeLicencePageTexts, parseDrivingLicenceText, resolveLicenceExpiry } from "./licence-text-parse";

test("reads numbered Sri Lankan DL fields and expiry as issue date plus 8 years", () => {
  const result = parseDrivingLicenceText(`
DEMOCRATIC SOCIALIST REPUBLIC OF SRI LANKA
DRIVING LICENCE
1. PERERA
1.2 KASUN AMARA SILVA
8. 123 Galle Road
Colombo 03
3. 12.01.1990
4a. 20.05.2020
4c. 1990 1234-5678
5. B 4455667
`);
  assert.equal(result.fullName, "KASUN AMARA SILVA PERERA");
  assert.equal(result.nic, "199012345678");
  assert.equal(result.drivingLicenceNumber, "B4455667");
  assert.match(result.address ?? "", /123 Galle Road/i);
  assert.match(result.address ?? "", /Colombo/i);
  assert.equal(result.drivingLicenceExpiry, "2028-05-20");
});

test("reads 1.2 when OCR drops the dot and puts the name on the next line", () => {
  const result = parseDrivingLicenceText(`
1 PERERA
12
KASUN AMARA
No 45, Galle Road
Colombo 03
3 12.01.1990
4a 20.05.2020
4c 199012345678
5 B4455667
`);
  assert.equal(result.fullName, "KASUN AMARA PERERA");
  assert.match(result.address ?? "", /Galle Road/i);
  assert.equal(result.drivingLicenceExpiry, "2028-05-20");
});

test("does not use date of birth as the licence expiry", () => {
  const result = parseDrivingLicenceText(`
1.2 AMARA SILVA
3. 01.01.1992
4a. 15.03.2019
4c. 199201012345
5. A1234567
`);
  assert.equal(result.drivingLicenceExpiry, "2027-03-15");
  assert.notEqual(result.drivingLicenceExpiry, "1992-01-01");
});

test("addYearsToIsoDate adds 8 years", () => {
  assert.equal(addYearsToIsoDate("2020-05-20", 8), "2028-05-20");
});

test("finds the address on the front immediately after the name", () => {
  const result = parseDrivingLicenceText(`
1.2 NIMAL FERNANDO
45 Temple Road, Kandy
4c 901234567V
5 A9988776
`);
  assert.match(result.fullName ?? "", /NIMAL FERNANDO/i);
  assert.match(result.address ?? "", /Temple Road/i);
  assert.doesNotMatch(result.fullName ?? "", /Temple/i);
});

test("keeps a long full name and a multi-line field 8 address", () => {
  const result = parseDrivingLicenceText(`
1. WICKRAMASINGHE
1.2 W M KASUN AMARA BANDARA
8
No 12, Galle Road
Kalutara South
Western Province
9 A B C
`);
  assert.match(result.fullName ?? "", /W M KASUN AMARA BANDARA WICKRAMASINGHE/i);
  assert.match(result.address ?? "", /12, Galle Road/i);
  assert.match(result.address ?? "", /Kalutara/i);
  assert.match(result.address ?? "", /Western Province/i);
});

test("keeps Sinhala and English address lines from field 8", () => {
  const result = parseDrivingLicenceText(`
1.2 AMARA SILVA
8
12, ගාලු පාර
Kalutara South
`);
  assert.match(result.address ?? "", /ගාලු/);
  assert.match(result.address ?? "", /Kalutara/i);
});

test("mergeLicencePageTexts takes the name from the front and address from the back", () => {
  const result = mergeLicencePageTexts([
    `
1. PERERA
1.2 KASUN AMARA
5 B4455667
4c 199012345678
4a 20.05.2020
`,
    `
8
No 45, Galle Road
Colombo 03
`,
  ]);
  assert.equal(result.fullName, "KASUN AMARA PERERA");
  assert.match(result.address ?? "", /45, Galle Road/i);
  assert.match(result.address ?? "", /Colombo/i);
  assert.equal(result.drivingLicenceNumber, "B4455667");
});

test("parseDrivingLicenceText still reads labeled cards", () => {
  const result = parseDrivingLicenceText(`
Licence No: B 4455667
Name: AMARA SILVA
NIC: 1990 1234-5678
Address: 123 Galle Road
Date of Issue: 20.05.2020
`);
  assert.equal(result.fullName, "AMARA SILVA");
  assert.equal(result.nic, "199012345678");
  assert.equal(result.drivingLicenceNumber, "B4455667");
  assert.equal(result.drivingLicenceExpiry, "2028-05-20");
});

test("uses printed 4b when it differs from issue date plus 8 years", () => {
  const result = parseDrivingLicenceText(`
1.2 AMARA SILVA
4a. 20.05.2020
4b. 20.05.2024
5. B4455667
`);
  assert.equal(result.drivingLicenceExpiry, "2024-05-20");
  assert.equal(resolveLicenceExpiry("2020-05-20", "2024-05-20"), "2024-05-20");
});

test("does not treat issuing authority 4c as the NIC", () => {
  const result = parseDrivingLicenceText(`
1.2 AMARA SILVA
4c. Commissioner General of Motor Traffic
NIC: 199012345678
5. B4455667
`);
  assert.equal(result.nic, "199012345678");
  assert.equal(result.drivingLicenceNumber, "B4455667");
});

test("does not mix the address into the name or use back class dates as expiry", () => {
  const result = parseDrivingLicenceText(`
1. PERERA
1.2 KASUN AMARA
No 12, Galle Road
Colombo 03
3. 12.01.1990
4a. 20.05.2020
4c. 199012345678
5. B4455667
A1 A B1 B C1
15.03.2019 15.03.2027
`);
  assert.equal(result.fullName, "KASUN AMARA PERERA");
  assert.match(result.address ?? "", /Galle Road/i);
  assert.match(result.address ?? "", /Colombo/i);
  assert.doesNotMatch(result.fullName ?? "", /Galle|Colombo/i);
  assert.equal(result.nic, "199012345678");
  assert.equal(result.drivingLicenceNumber, "B4455667");
  assert.equal(result.drivingLicenceExpiry, "2028-05-20");
});
