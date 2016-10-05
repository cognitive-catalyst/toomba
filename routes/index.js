const express           = require('express')
const cypherRoutes      = require('./cypher')
const postgresRoutes    = require('./postgres')
const redisRoutes       = require('./redis')
const gremlinRoutes     = require('./gremlin')

const router = express.Router();

router.use('/cypher/', cypherRoutes);
router.use('/postgres/', postgresRoutes);
router.use('/redis/', redisRoutes);
router.use('/gremlin/', gremlinRoutes);

module.exports = router;
