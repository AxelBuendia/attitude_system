if (typeof process == 'undefined'){
	var process = {};
}
if (typeof process.env == 'undefined'){
  process.env = {};
}
if (typeof process.env.WS_PORT == 'undefined'){
  process.env.WS_PORT = 3000;
}
