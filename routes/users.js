const express = require('express');
const router = express.Router();
const usercontroller = require('../controllers/usercontroller');
const validateToken = require('../middlewares/authMiddleware');

router.get('/get_users', validateToken, usercontroller.getusers);


router.get('/get_user/:id', validateToken, usercontroller.getuser);

router.delete('/delete_user/:id', validateToken, usercontroller.deleteuser);



// export the router module so that server.js file can use it
module.exports = router;