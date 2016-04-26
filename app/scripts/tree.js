var m = [ 10, 150, 10, 100 ];
var w = 1280 - m[1] - m[3];
var h = 500 - m[0] - m[2];
var i = 0;
var root;

var tree = d3.layout.tree().size([ h, w ]);

var diagonal = d3.svg.diagonal().projection(function(d) {
	return [ d.y, d.x ];
});

var vis = d3.select("#tree").append("svg:svg").attr("width", w + m[1] + m[3])
		.attr("height", h + m[0] + m[2]).append("svg:g").attr("transform",
				"translate(" + m[3] + "," + m[0] + ")");

d3
		.json(
				"assets/tree.json",
				function(raw) {

					var rootNm = Object.keys(raw)[0];
					var rules = raw[rootNm]['rules'];
					var ruleset_id = raw[rootNm]['ruleset_id'];
					var json = {
						'id' : ruleset_id,
						'name' : rootNm
					};

					var tmpJson = new Array();
					for (var i = 0; i < rules.length; i++) {
//						var status = false;
						var tmp = rules[i];
						tmp['id'] = tmp.rule_id;
						if (tmp.action_meta.resources.length > 1) {
							for (var j = 0; j < tmp.action_meta.resources.length; j++) {
								if (!tmp['children']) {
									tmp['children'] = [];
								}
								tmp.action_meta.resources[j].name = tmp.action_meta.resources[j].base_url;
								tmp['children'][j] = tmp.action_meta.resources[j];
//								if(tmp.action_meta.resources[j].status) {
//									status = true;
//									tmp['status'] = status;
//								}
							}
						} else {
							tmp['name'] = tmp.action_meta.resources[0].base_url;
						}
						tmpJson[tmpJson.length] = tmp;
					}

					for (var i = tmpJson.length - 1; i > 0; i--) {
						if (!tmpJson[i - 1]['children']) {
							tmpJson[i - 1]['children'] = [];
							for (var j = 0; j < tmpJson[i].children.length; j++) {
								
							}
							tmpJson[i - 1]['children'][0] = tmpJson[i];
						} else {
							tmpJson[i - 1]['children'][tmpJson[i - 1]['children'].length] = tmpJson[i];
						}
					}

					json.children = [];
					json.children[0] = tmpJson[0];

					root = json;
					root.x0 = h / 2;
					root.y0 = 0;

					// function toggleAll(d) {
					// if (d.children) {
					// d.children.forEach(toggleAll);
					// toggle(d);
					// }
					// }

					// Initialize the display to show a few nodes.
					// root.children.forEach(toggleAll);
					// toggle(root.children[1]);
					// toggle(root.children[1].children[2]);
					// toggle(root.children[9]);
					// toggle(root.children[9].children[0]);
					update(root);
				});

function update(source) {
	var duration = d3.event && d3.event.altKey ? 5000 : 500;

	// compute the new height
	var levelWidth = [ 1 ];
	var childCount = function(level, n) {
		if (n.children && n.children.length > 0) {
			if (levelWidth.length <= level + 1)
				levelWidth.push(0);

			levelWidth[level + 1] += n.children.length;
			n.children.forEach(function(d) {
				childCount(level + 1, d);
			});
		}
	};
	childCount(0, root);
	var newHeight = d3.max(levelWidth) * 70;
	tree = tree.size([ newHeight, w ]);

	var nodes = tree.nodes(root).reverse();
	nodes.forEach(function(d) {
		d.y = d.depth * 120;
	});

	// Update the nodes…
	var node = vis.selectAll("g.node").data(nodes, function(d) {
		return d.id || (d.id = ++i);
	});

	// Enter any new nodes at the parent's previous position.
	var nodeEnter = node.enter().append("svg:g").attr("class", "node").attr(
			"transform", function(d) {
				return "translate(" + source.y0 + "," + source.x0 + ")";
			}).on("click", function(d) {
		toggle(d);
		update(d);
	}).on("mouseover", function(d, i) {
		var html = '<ul>';
		if (d.name) {
			html += '<li>name: ' + d.name + '</li>';
		} else {
			html += '<li>rule_id: ' + d.rule_id + '</li>';
		}
		html += '<ul>';
		html += '<li>id: ' + d.id + '</li>';
		if (d.type) {
			html += '<li>type: ' + d.type + '</li>';
		}
		if (d.url_type) {
			html += '<li>url_type: ' + d.url_type + '</li>';
		}
		if (d.action_type) {
			html += '<li>action_type: ' + d.action_type + '</li>';
		}
		if (d.rule_id) {
			html += '<li>is_default: ' + d.is_default + '</li>';
		}
		html += '</ul>';
		if(d.status) {
			html += '<li>status: working</li>';
		} else {
			html += '<li>status: failed</li>';
		}
		html += '</ul>';
		tooltip(html, 190);
	}).on("mouseout", function() {
		d3.select("body").select('div.tooltip').remove();
	});

	nodeEnter.append("svg:circle").attr("r", 1e-6).style("fill", function(d) {
		return "lightsteelblue";
	});

	nodeEnter.append("svg:text").attr("y", function(d) {
		return 20;
	}).attr("x", function(d) {
		if (!d.parent) {
			return 30;
		} else if (d.children || d._children) {
			return 15;
		} else if (d.is_default) {
			return -15;
		} else {
			return -30;
		}
	}).attr("dy", ".35em").attr("text-anchor", function(d) {
		return d.children || d._children ? "end" : "start";
	}).text(
			function(d) {
				if (d.action_meta) {
					return d.rule_id;
				} else {
					if (d.name.indexOf('::') > -1) {
						return d.name.substring(d.name.lastIndexOf('::') + 2,
								d.name.length);
					} else {
						return d.name;
					}
				}
			}).style("fill-opacity", 1e-6);

	var nodeUpdate = node.transition().duration(duration).attr("transform",
			function(d) {
				return "translate(" + d.y + "," + d.x + ")";
			});

	nodeUpdate.select("circle").attr("r", 4.5).style("fill", function(d) {
		if (d._children) {
			return "lightsteelblue";
		} else {
			if (d.rule_id) {
				return "blue";
			} else {
				return "green";
			}
		}
	});

	nodeUpdate.select("text").style("fill-opacity", 1);

	// Transition exiting nodes to the parent's new position.
	var nodeExit = node.exit().transition().duration(duration).attr(
			"transform", function(d) {
				return "translate(" + source.y + "," + source.x + ")";
			}).remove();

	nodeExit.select("circle").attr("r", 1e-6);

	nodeExit.select("text").style("fill-opacity", 1e-6);

	// Update the links…
	var link = vis.selectAll("path.link").data(tree.links(nodes), function(d) {
		return d.target.id;
	});

	// Enter any new links at the parent's previous position.
	link.enter().insert("svg:path", "g").attr("class", "link").attr("d",
			function(d) {
				var o = {
					x : source.x0,
					y : source.y0
				};
				return diagonal({
					source : o,
					target : o
				});
			}).transition().duration(duration).attr("d", diagonal);

	// Transition links to their new position.
	link.transition().duration(duration).attr("d", diagonal).style(
			"stroke", function(d) {
				if(d.source.status && d.target.status) {
					return 'blue';
				} else {
					return 'steelblue';
				}
			});
	
	// Transition exiting nodes to the parent's new position.
	link.exit().transition().duration(duration).attr("d", function(d) {
		var o = {
			x : source.x,
			y : source.y
		};
		return diagonal({
			source : o,
			target : o
		});
	}).remove();

	// Stash the old positions for transition.
	nodes.forEach(function(d) {
		d.x0 = d.x;
		d.y0 = d.y;
	});
}

// Toggle children.
function toggle(d) {
	if (d.children) {
		d._children = d.children;
		d.children = null;
	} else if (d.rule_id) {
		d.children = d._children;
		d._children = null;
	}
}

function tooltip(txt, width) {
	d3.select("body").select('div.tooltip').remove();
	var html = '<div>' + txt + '</div>';
	var tooltip = d3.select("body").append("div")
			.attr('pointer-events', 'none').attr("class", "tooltip").style(
					"opacity", 1).html(html).style("width", width + "px")
			.style("left", (d3.event.pageX + 2 + "px")).style("top",
					(d3.event.pageY + 2 + "px"));
}
