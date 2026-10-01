import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BROADCAST_READ_ENTITY,
  isBroadcastReadReceipt,
  isUnreadForUser,
  overlayBroadcastReadState,
} from "./notification-read";

describe("broadcast notification read state", () => {
  it("does not treat a personal read as changing another user's broadcast", () => {
    const broadcast = {
      id: "n1",
      userId: null,
      isRead: false,
      entityType: "Rental",
    };
    const userARead = overlayBroadcastReadState([broadcast], ["n1"]);
    const userBUnread = overlayBroadcastReadState([broadcast], []);

    assert.equal(userARead[0]?.isRead, true);
    assert.equal(userBUnread[0]?.isRead, false);
    assert.equal(broadcast.isRead, false);
  });

  it("hides read-receipt rows from the visible list", () => {
    const rows = overlayBroadcastReadState(
      [
        { id: "n1", userId: null, isRead: false, entityType: "Rental" },
        { id: "r1", userId: "user-a", isRead: true, entityType: BROADCAST_READ_ENTITY },
      ],
      ["n1"]
    );
    assert.equal(rows.length, 1);
    assert.equal(rows[0]?.id, "n1");
    assert.equal(isBroadcastReadReceipt({ entityType: BROADCAST_READ_ENTITY }), true);
  });

  it("counts a broadcast as unread until that user has a receipt", () => {
    const broadcast = { id: "n1", userId: null, isRead: false, entityType: "Rental" };
    assert.equal(isUnreadForUser(broadcast, []), true);
    assert.equal(isUnreadForUser(broadcast, ["n1"]), false);
  });
});
