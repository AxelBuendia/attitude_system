var CFG = {};
if (typeof process != 'undefined' && typeof process.env != 'undefined' && typeof process.env.PORT != 'undefined')
	CFG.PORT = process.env.PORT;
else
	CFG.PORT = 3000;
