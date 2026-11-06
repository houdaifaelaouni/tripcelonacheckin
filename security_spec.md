# Security Specification: Tripcelona Cloud System

## 1. Data Invariants
1. **User Identity & Role Protection**:
   - Only authenticated users can access the application data.
   - Users cannot arbitrarily elevate themselves to \`admin\` if another role is assigned.
   - The primary bootstrapped admin is the application owner (\`houdayfaelaouni2006@gmail.com\`).
2. **Travel Creation & Place Customization**:
   - Capacity places must be positive integers between 1 and 200.
   - Only \`admin\` or \`travel_creator\` can create or update travels.
   - Deletion of travels is restricted to \`admin\`.
3. **Pass / Ticket Generation & Seat Bounds**:
   - Tickets must reference a valid \`tripId\`.
   - Seat numbers must not exceed the travel's configured capacity.
   - Only \`admin\` or \`ticketing_agent\` can generate tickets.
4. **Validation & Check-in Integrity**:
   - Drivers and admins can toggle boarding status (\`checked_in\` or \`pending\`).
   - Drivers cannot modify passenger personal credentials (name, destination, seat).
   - Once checked in, timestamp and conductor identity are safely recorded.

## 2. The "Dirty Dozen" Malicious Payloads
1. **Ghost Field Privilege Escalation**: User registers with role \`admin\` without authorization.
2. **Path Traversal / ID Poisoning**: \`ticketId\` with malicious characters \`../../malicious\`.
3. **Negative / Zero Capacity Poisoning**: Creating a travel with \`capacity: -50\`.
4. **Over-capacity Seat Allocation**: Booking seat #99 on a 30-place bus.
5. **Driver Name Tampering**: Driver trying to alter passenger destination or seat during check-in.
6. **Denial of Wallet String Injection**: 500KB string passed into \`firstName\` or \`destination\`.
7. **Orphaned Ticket Creation**: Creating a ticket referencing a non-existent \`tripId\`.
8. **Unauthenticated Public Scrape**: An unauthenticated user querying \`/tickets\` to harvest passenger manifest.
9. **Role Self-Modification**: A \`driver\` or \`ticketing_agent\` updating their user profile to \`admin\`.
10. **Duplicate Check-in Timestamp Manipulation**: Tampering with \`checkedInAt\` using past dates.
11. **Unauthorized Travel Deletion**: Ticketing agent or driver attempting to delete a trip.
12. **Malformed JSON Injection**: Corrupting the \`qrPayload\` with unauthorized arbitrary object trees.

## 3. Test Runner Design
- All dirty dozen payloads must receive \`PERMISSION_DENIED\`.
- All legitimate reads, creates, and state transitions for each role are verified against \`firestore.rules\`.
