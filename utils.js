function copyProps(from, to, type, names){
	if(type)
		if(type === 'without')
			for(var p in from){
				if( names.indexOf(p) == -1 )
					if(p in to)
						console.warn('property '+ p + 'already exist in destination');
					else
						to[p] = from[p]
			}
		else if(type === 'only')
			for(var p in from){
				if( names.indexOf(p) != -1 )
					if(p in to)
						console.warn('property '+ p + 'already exist in destination');
					else
						to[p] = from[p]
			}
		else
			console.assert(false,'unknown type of copying in copyProps')
	else
		for(var p in from){
			if(p in to)
				console.warn('property '+ p + 'already exist in destination');
			else
				to[p] = from[p]
		}
}

function checkPropsStrict(obj,names){
	var checked = new Array(names.length)
	for(var p in obj){
		var i = names.indexOf(p)
		if( i == -1 )
			console.warn('property '+p+' is unnecessary')
		else
			checked[i] = true;
	}
	for(var i = 0; i<names.length; i++)
		if(!checked[i])
			console.warn('property '+names[i]+' is epsent')
}

function checkProps(obj,names){
	for(var i = 0; i<names.length; i++)
		if(!(names[i] in obj))
			console.warn('property '+names[i]+' is epsent')
}

// nodejs compatible on server side and in the browser.
function inherits(ctor, superCtor) {
	ctor.super_ = superCtor;
	ctor.prototype = Object.create(superCtor.prototype, {
		constructor: {
			value: ctor,
			enumerable: false,
			writable: true,
			configurable: true
		}
	});
}

function typeOf(x) {
	return typeof x;
}

function realTypeOf(subject) {
	var type = typeof subject;
	if (type !== 'object') {
		return type;
	}

	if (subject === Math) {
		return 'math';
	} else if (subject === null) {
		return 'null';
	} else if (Array.isArray(subject)) {
		return 'array';
	} else if (Object.prototype.toString.call(subject) === '[object Date]') {
		return 'date';
	} else if (typeof subject.toString !== 'undefined' && /^\/.*\//.test(subject.toString())) {
		return 'regexp';
	}
	return 'object';
}
