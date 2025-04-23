import { Router } from "express";
import {
  createStaticList,
  createDynamicList,
  getDynamicListContacts,
  getAllLists,
  updateList,
  deleteList,
  exportList,
} from "../controllers/lists/listController";

const router: Router = Router();

router.post("/static", createStaticList);
router.post("/dynamic", createDynamicList);
router.get("/dynamic/:id", getDynamicListContacts);
router.get("/export/:id", exportList);
router.get("/", getAllLists);
router.put("/:id", updateList);
router.delete("/:id", deleteList);

export default router;
