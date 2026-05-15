const { Router } = require('express');
const { getAll, update, rename } = require('../controllers/settingsController');
const router = Router();

router.get('/', getAll);
router.put('/', update);
router.put('/rename', rename);

module.exports = router;