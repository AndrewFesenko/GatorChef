# TODO Phase 3: Pantry CRUD service
#
# Operates on Firestore subcollection: users/{uid}/pantry/
#
# def list_items(uid: str) -> list[PantryItem]
# def add_item(uid: str, item: PantryItemCreate) -> PantryItem
# def update_item(uid: str, item_id: str, updates: PantryItemUpdate) -> PantryItem
# def delete_item(uid: str, item_id: str) -> None
# def clear_all(uid: str) -> None
#
# Uses: app.firebase_admin_init.db
