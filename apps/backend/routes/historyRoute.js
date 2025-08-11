const express=require('express');
const { bill } = require('../controllers/billController');

const historyRouter=express.Router();

historyRouter.post('/bill',bill);

module.exports=historyRouter;