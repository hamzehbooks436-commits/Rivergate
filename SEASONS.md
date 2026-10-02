# Seasons and decorations

The daily city calendar now controls terrain and foliage:

- December through February: whitish snow-covered ground and frosty trees.
- March 1 through June 10: fresh green grass and foliage.
- June 11 through September 30: green ground with yellow dry patches.
- October 1 through November 30: orange/golden ground, autumn trees and fallen leaves.

Open **Seasons** in the bottom toolbar, or click the date, for the holiday calendar. Each season has two annual Rivergate celebrations. Active holidays give residents +3 happiness and generate city notices. These are local game celebrations, not a real-world public-holiday calendar.

Open **Decorations** for eight original Blender models: bench ($40), flower bed ($65), lantern ($80), fountain ($220), bunting ($55), harvest display ($90), snowman ($45), and festive tree ($140). Prices are before the difficulty multiplier. All occupy one tile, place instantly on clear owned dry land, need no utilities or road, and have no monthly upkeep. They support rotation, deletion, undo and saves. They remain placed year-round.

An all-season or currently matching seasonal decoration within five tiles gives a home +1 happiness and an additional +2 during holidays. Multiple decorations do not stack these bonuses.

Authoring source: `art/create_decorations.py`; editable Blender scene: `art/rivergate-decorations.blend`; eight GLBs and a manifest: `assets/models/`. These assets were authored and exported through Blender MCP.

Verification was stopped at the user's request. The earlier check run reached a total-happiness assertion affected by woodland removal; that assertion was narrowed in source but not rerun. Final gameplay and browser appearance are unverified.
