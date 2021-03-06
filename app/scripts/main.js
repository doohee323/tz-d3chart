// ///////////////////////////////////////////////////////////////////////////////
// [ UptimeChart constructor ]
// ///////////////////////////////////////////////////////////////////////////////
var UptimeChart = function(config) {
  var _super = this;
  _super.config = config;
  _super.resize();
  d3.select(window).on("resize", function() {
    _super.resize();
  });

  _super.fullFormatDate = d3.time.format("%Y-%m-%dT%H:%M:%S.%LZ");
  _super.miniAxisFormat = "%Y-%m-%d";
  _super.parseDate = _super.fullFormatDate.parse;

  $('#from').val('-' + _super.config.slider.init.x1 + 'min');
  $('#until').val('-' + _super.config.slider.init.x0 + 'min');

  $('#datepairElem .time').timepicker({
    'showDuration' : true,
    'timeFormat' : 'g:i A'
  });

  $('#datepairElem .date').datepicker({
    'format' : 'dd-mm-yyyy',
    'autoclose' : true
  });

  var basicExampleEl = document.getElementById('datepairElem');
  var datepair = new Datepair(basicExampleEl);

  $('#datepairElem').on('rangeSelected', function(e) {
    _super.changeDateWithDatepair();
  }).on('changeTime', function(e) {
    _super.changeDateWithDatepair();
  }).on('rangeIncomplete', function() {
  }).on('rangeError', function() {
  });

  _super.selectedTab = function() {
    if ($('#response')[0].style.display == '') {
      if ($('#view').find("li.active").text() == 'Response') {
        return 'Response';
      } else {
        return 'Availability';
      }
    } else {
      return 'Availability';
    }
  }

  // make chartData for Chart
  _super.getStateData = function(resultset, type) {
    var max = 0;
    _super.test_class = resultset.meta.test_class;
    $('#test_class').text("[" + _super.test_class.toUpperCase() + "]");
    var judge = resultset.data.judge;
    var include = resultset.data.include[0];
    var metrices = resultset.meta.metrices;
    var locs = resultset.meta.locs;

    var locMetric;
    var metric;
    var active;
    if (type == 'average') {
      metric = resultset.data.avgMetric;
      active = resultset.data.avgActive[0];
    } else {
      metric = resultset.data.metric;
      active = resultset.data.active;
    }
    var chartData = new Array();

    for (var q = 0; q < metric[0].datapoints.length - 1; q++) {
      var avail = 0;
      var sum = 0;
      var jsonRow = {
        date : _super.toUTC(new Date(metric[0].datapoints[q][1] * 1000))
      };
      for (var i = 0; i < metric.length; i++) {
        var target = metric[i].target;
        var loc;
        if (type != 'average') {
          loc = target.substring(0, target.lastIndexOf('.'));
          target = target.substring(target.lastIndexOf('.') + 1, target.length);
        }
        if (!metric[i].description) {
          metric[i].description = new Array();
        }
        if (!metric[i].description[q]) {
          metric[i].description[q] = {};
        }
        if (type != 'average') {
          var active = resultset.data.active;
          for (var p = 0; p < active.length; p++) {
            if (active[p].target == loc) {
              active = active[p];
              break;
            }
          }
          jsonRow.loc = loc;
        }
        if (typeof active.datapoints != "undefined") {
          var v1 = active.datapoints[q][0];
          if (!v1) {
            v1 = 0;
          }
          var v2 = metric[i].datapoints[q][0] != null ? metric[i].datapoints[q][0]
              : 0;
          var v3 = include.datapoints[q][0];
          if (v1) {
            v1 = Number((v1).toFixed(1));
          }
          metric[i].description[q].v1 = v1;
          metric[i].description[q].v2 = v2;
          metric[i].description[q].v3 = v3;
          avail = Math.floor((v2 / (v1 + v3)));
          if (isNaN(avail) || avail == Number.POSITIVE_INFINITY) {
            avail = 0;
          }
          jsonRow[target] = v2;
          sum += avail;
        }
      } // for i
      if (judge && typeof active.datapoints != "undefined") {
        if (!judge[0].datapoints[q][0] || judge[0].datapoints[q][0] == 0) {
          jsonRow['judge'] = 0;
        } else {
          jsonRow['judge'] = judge[0].datapoints[q][0];
        }
      }
      if (sum > max) {
        max = sum;
      }
      jsonRow['state'] = sum;
      chartData.push(jsonRow);
    } // for q
    if (type == 'average') {
      _super.metric_data = metric;
      _super.state_max = max;
    }

    for (var i = 0; i < chartData.length; i++) {
      var state = chartData[i]['state'];
      var state_per = (max - state) / max * 100;
      if (state_per) {
        state_per = Number((state_per).toFixed(1));
      } else {
        state_per = 0;
      }
      chartData[i]['state'] = state_per;
    }
    return chartData;
  }

  _super.brushRange = function(type) {
    d3.selectAll('.brushed_range').remove();
    if (_super.selectedTab() == 'Response') {
      _super.sc.stSvg.append('g').attr('class', 'brushed_range').append("text")
          .attr("x", _super.config.lineChart.main.margin.width - 200).attr("y",
              -5).attr("text-anchor", "middle").style("text-decoration",
              "underline").text(
              moment(_super.extent[0]).format(_super.config.format.full_date)
                  + ' ~ '
                  + moment(_super.extent[1]).format(
                      _super.config.format.full_date));
    } else {
      _super.lc.lineSvg.append('g').attr('class', 'brushed_range').append(
          "text").attr("x", _super.config.lineChart.main.margin.width - 160)
          .attr("y", 45).attr("text-anchor", "middle").style("text-decoration",
              "underline").text(
              moment(_super.extent[0]).format(_super.config.format.full_date)
                  + ' ~ '
                  + moment(_super.extent[1]).format(
                      _super.config.format.full_date));
    }
  }

  _super.isBrushed = function() {
    if (!_super.extent) {
      return false;
    }
    var ori_start = moment(
        _super.resultset.data.avgActive[0].datapoints[0][1] * 1000).toDate();
    var ori_end = moment(
        _super.resultset.data.avgActive[0].datapoints[_super.resultset.data.avgActive[0].datapoints.length - 1][1] * 1000)
        .toDate();
    var brush_start = _super.extent[0];
    var brush_end = _super.extent[1];
    var a = moment(ori_start).diff(moment(brush_start), 'minutes');
    var b = moment(ori_end).diff(moment(brush_end), 'minutes');
    if ((Math.abs(a) + Math.abs(b)) <= 1) {
      return false;
    }
    return true;
  }

  // [ updateChart with brushing ]
  _super.update = function(extent, metric) {
    var json = [];

    if (!_super.isBrushed()) {
      _super.getExtent(_super.resultset.data.avgActive[0].datapoints);
      if (_super.selectedTab() == 'Availability') {
        _super.mc.brushEvent(_super.extent);
      }
    }

    if (_super.selectedTab() == 'Response') {
      _super.sc.update(_super.sc.getData(_super.lineData), function() {
        _super.hst.update(_super.hst.getData(_super.lineData), function(data) {
          _super.gauge.update(data.tot_ms);
          _super.brushRange();
        });
        if (_super.metric) {
          $('#' + _super.config.lineChart.combo.id).val(_super.metric);
        }
      });
    } else {
      _super.lc.init();
      _super.metric = !_super.metric ? _super.config.lineChart.combo.init
          : _super.metric;
      _super.lc.update(_super.lc.getRangeData(_super.lineData), _super.metric,
          function() {
            _super.brushRange();
          });
    }
    _super.map.mapData = _super.map.getData(_super.resultset, metric);
    json = _super.map.getBrushedData();
    _super.map.update(json, metric);
  }

  _super.getExtent = function(json) {
    var start = json[0][1];
    var end = json[json.length - 1][1];
    var diff_days = moment(end * 1000).diff(moment(start * 1000), 'days');
    if (diff_days > 0) {
      _super.axisFormat = "%d %H:%M";
    } else {
      _super.axisFormat = "%H:%M";
    }
    if (!_super.range) {
      _super.range = [ _super.toUTC(moment(start * 1000).toDate()),
          _super.toUTC(moment(end * 1000).toDate()) ];
    }
    _super.diff = moment(end * 1000).diff(moment(start * 1000), 'minutes');
    var range = _super.diff * (_super.config.lineChart.main.range / 100);
    if (_super.diff > range) {
      _super.extent = [
          _super.toUTC(moment(end * 1000).add(range * -1, 'minutes').toDate()),
          _super.toUTC(moment(end * 1000).toDate()) ];
    }
  }

  _super.convertRGBDecimalToHex = function(rgb) {
    var regex = /rgb *\( *([0-9]{1,3}) *, *([0-9]{1,3}) *, *([0-9]{1,3}) *\)/;
    var values = regex.exec(rgb);
    if (values.length != 4) {
      return rgb; // fall back to what was given.
    }
    var r = Math.round(parseFloat(values[1]));
    var g = Math.round(parseFloat(values[2]));
    var b = Math.round(parseFloat(values[3]));
    return "#" + (r + 0x10000).toString(16).substring(3).toUpperCase()
        + (g + 0x10000).toString(16).substring(3).toUpperCase()
        + (b + 0x10000).toString(16).substring(3).toUpperCase();
  }

  _super.getLabelName = function(akey, type) {
    var mapping = _super.config.mapping;
    for ( var key in mapping) {
      if (key == akey) {
        if (type) {
          if (type == 'full') {
            return mapping[key].full;
          } else {
            return mapping[key].full.replace(' (ms)', '');
          }
        } else {
          return mapping[key].short;
        }
      }
    }
    return akey;
  }

  _super.getLocName = function(akey) {
    var mapping = _super.resultset.meta.locs;
    for (var i = 0; i < mapping.length; i++) {
      if (mapping[i].loc == akey) {
        return mapping[i].label;
      }
    }
    return akey;
  }

  _super.mapCombo = function(ds, id, cb) {
    id = '#' + id;
    if ($(id + " option").length > 0)
      return;
    var select = $(id);
    if (select.length > 0) {
      var options;
      if (select.prop) {
        options = select.prop('options');
      } else {
        options = select.attr('options');
      }
      $('option', select).remove();
      options[options.length] = new Option('Select', '*');
      $.each(ds, function(key, obj) {
        options[options.length] = new Option(
            _super.getLocName(obj.loc, 'full'), obj.loc);
      });
      select.change(function(e) {
        try {
          cb.call(e, $(id).val());
        } catch (e) {
        }
      });
    }
  }

  _super.slider = function(val) {
    d3.selectAll('#slider').remove();
    $("<div></div>").attr('id', 'slider').appendTo($("#sliderDiv"));
    d3.select('#slider').call(
        d3.slider().axis(d3.svg.axis().orient("bottom").ticks(5)).min(
            _super.config.slider.range.min).max(_super.config.slider.range.max)
            .step(_super.config.slider.step).value(val).on("slideend",
                function(e) {
                  uc.createChart();
                }).on(
                "slide",
                function(evt, value) {
                  _super.slider.values = value;
                  $('#from').val('-' + value[1] + 'min');
                  $('#until').val('-' + value[0] + 'min');

                  var now = moment();
                  var start_date = moment(now).add('minutes', value[1] * -1);
                  var end_date = moment(now).add('minutes', value[0] * -1);
                  $('#datepairElem .date.start').val(
                      start_date.format("DD/MM/YYYY"));
                  $('#datepairElem .date.end').val(
                      end_date.format("DD/MM/YYYY"));
                  $('#datepairElem .time.start').val(start_date.format("LT"));
                  $('#datepairElem .time.end').val(end_date.format("LT"));

                  _super.date_start = $('#datepairElem .date.start').val();
                  _super.date_end = $('#datepairElem .date.end').val();
                  _super.time_start = $('#datepairElem .time.start').val();
                  _super.time_end = $('#datepairElem .time.end').val();
                }));
    _super.slider.values = val;
  }
  _super.slider([ _super.config.slider.init.x0, _super.config.slider.init.x1 ]);

  _super.addMinutes = function(val) {
    var now = moment();
    var start_date = moment(now).add(val * -1, 'minutes');
    var end_date = moment();
    $('#datepairElem .date.start').val(start_date.format("DD/MM/YYYY"));
    $('#datepairElem .date.end').val(end_date.format("DD/MM/YYYY"));
    $('#datepairElem .time.start').val(start_date.format("LT"));
    $('#datepairElem .time.end').val(end_date.format("LT"));
    _super.date_start = $('#datepairElem .date.start').val();
    _super.date_end = $('#datepairElem .date.end').val();
    _super.time_start = $('#datepairElem .time.start').val();
    _super.time_end = $('#datepairElem .time.end').val();
  }
  _super.addMinutes(_super.config.slider.init.x1);

  _super.legend = function(g, id, metric) {
    g.each(function() {
      var g = d3.select(this);
      var items = {};
      var legendPadding = g.attr("data-style-padding") || 10;
      var lb = g.selectAll(".legend-box").data([ true ]);
      var li = g.selectAll(".legend-items").data([ true ]);
      li.enter().append("g").classed("legend-items", true);

      d3.select(id).selectAll("[data-legend]").each(
          function() {
            var self = d3.select(this);
            if (metric == '*') {
              items[self.attr("data-legend")] = {
                pos : self.attr("data-legend-pos") || _super.getBBox(this).y,
                color : self.attr("data-legend-color") != undefined ? self
                    .attr("data-legend-color")
                    : self.style("fill") != 'none' ? self.style("fill") : self
                        .style("stroke")
              }
            } else {
              for ( var amet in _super.metrices) {
                if (amet == metric) {
                  items[self.attr("data-legend")] = {
                    pos : self.attr("data-legend-pos")
                        || _super.getBBox(this).y,
                    color : self.attr("data-legend-color") != undefined ? self
                        .attr("data-legend-color")
                        : self.style("fill") != 'none' ? self.style("fill")
                            : self.style("stroke")
                  }
                } else {
                  items[amet] = {
                    "color" : "#DFDFDC",
                    "pos" : 0
                  }
                }
              }
            }
          })
      items = d3.entries(items).sort(function(a, b) {
        return a.key.length - b.key.length; // a.value.pos -
        // b.value.pos;
      })

      // set first in array
      var items2 = new Array();
      var ritem;
      for (var i = 0; i < items.length; i++) {
        if (items[i].key == _super.config.lineChart.main.yAxis.right) {
          ritem = items[i];
          break;
        }
      }
      if (ritem) {
        items2.push(ritem);
      }
      for (var i = 0; i < items.length; i++) {
        if (items[i].key != _super.config.lineChart.main.yAxis.right
            && items[i]) {
          items2.push(items[i]);
        }
      }
      items = items2;

      var toggle = function(showFg, d, i) {
        var metric = d.key;
        _super.metric = metric;
        _super.map.metric = metric;
        _super.update(null, metric);
      }

      li.selectAll("text").data(items, function(d) {
        return d.key;
      }).call(function(d) {
        d.enter().append("text").attr("fill", "#585956");
      }).call(function(d) {
        d.exit().remove();
      }).attr("y", function(d, i) {
        var y = _super.config.legend.y + 1.2;
        return y + "em";
      }).attr("x", function(d, i) {
        var x = i * _super.config.legend.x + 2;
        return x + "em";
      }).text(function(d, i) {
        return _super.getLabelName(d.key);
      }).on("mouseover", function(d, i) {
        _super.tooltip(_super.getLabelName(d.key, 'full'), 190);
      }).on("mouseout", function() {
        d3.select("body").select('div.tooltip').remove();
      }).on("click", function(d, i) {
        toggle('show', d, i);
        $('#' + _super.config.lineChart.combo.id).val(d.key);
      }).style("cursor", "pointer");

      li.selectAll("rect").data(items, function(d) {
        return d.key;
      }).call(function(d) {
        d.enter().append("rect");
      }).call(function(d) {
        d.exit().remove();
      }).attr("x", function(d, i) {
        var x = i * _super.config.legend.x;
        return x + "em";
      }).attr("y", function(d, i) {
        var y = _super.config.legend.y;
        return y + "em";
      }).attr("width", _super.config.legend.width).attr("height",
          _super.config.legend.height)
      // }).call(function(d) {
      // d.enter().append("circle");
      // }).call(function(d) {
      // d.exit().remove();
      // }).attr("cy", function(d, i) {
      // return "0em";
      // }).attr("cx", function(d, i) {
      // var col = i * _super.config.legend.x;
      // return col + "em";
      // }).attr("r", "0.8em")
      .style("fill", function(d) {
        return d.value.color;
      }).on("mouseover", function(d, i) {
      }).on("mouseout", function() {
      }).on("click", function(d, i) {
        toggle('hide', d, i);
        $('#' + _super.config.lineChart.combo.id).val(d.key);
      }).style("cursor", "pointer");

      var lbbox = _super.getBBox(li[0][0]);
      lb.attr("x", (lbbox.x - legendPadding)).attr("y",
          (lbbox.y - legendPadding)).attr("height",
          (lbbox.height + 2 * legendPadding)).attr("width",
          (lbbox.width + 2 * legendPadding));
    })
    return g;
  }

  _super.toUTCString = function(st) {
    return this.toUTC(st).toString();
  }

  _super.toUTC = function(date) {
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date
        .getUTCDate(), date.getUTCHours(), date.getUTCMinutes(), date
        .getUTCSeconds(), date.getUTCMilliseconds());
  }

  _super.getBBox = function(obj) {
    var bbox = {};
    try {
      bbox = obj.getBBox();
      if (navigator.userAgent.indexOf("MSIE") == -1 && !bbox.x && !bbox.y
          && !bbox.height && !bbox.width) {
        bbox.x = obj.attr('x');
        bbox.y = obj.attr('y');
      }
    } catch (e) {
      // for firefox
    } finally {
      bbox = bbox || {};
      return bbox;
    }
  }

  _super.debug = function(input) {
    d3.select("body").select('div.debug').remove();
    var txt = '<div align="right"><button type="button" id="close" onclick="javascript: uc.closeDebug();">x</button></div>';
    txt += '<div><iframe id="jsonview" class="debug_ifr"></iframe></div>';
    var html = '<div>' + txt + '</div>';
    var tooltip = d3.select("body").append("div")
        .attr('pointer-events', 'none').attr("class", "debug").style("opacity",
            1).html(html).style("left", (d3.event.pageX + 2 + "px")).style(
            "top", (d3.event.pageY + 2 + "px"));
    $('#jsonview').contents().find('html').html(input);
    $(document.getElementById('jsonview').contentWindow.document.body).css(
        'font-size', '12px')
  }

  _super.closeDebug = function() {
    d3.select("body").select("div.debug").remove();
  }

  _super.tooltip = function(txt, width) {
    d3.select("body").select('div.tooltip').remove();
    if (txt.indexOf("\n") > -1) {
      txt = '<div>' + txt.split("\n").join("</div>\n<div>") + '</div>';
    }
    var html = '<div>' + txt + '</div>';
    var tooltip = d3.select("body").append("div")
        .attr('pointer-events', 'none').attr("class", "tooltip").style(
            "opacity", 1).html(html).style("width", width + "px").style("left",
            (d3.event.pageX + 2 + "px")).style("top",
            (d3.event.pageY + 2 + "px"));
  }

  _super.ajaxMessage = function(alert_type, msg) {
    "use strict";
    $('#serverMessages').css('display', 'none');
    if (alert_type == 'clear') {
      $('#ajaxMessages').css('display', 'none');
    } else {
      $('#ajaxMessages').removeClass('alert-error')
          .removeClass('alert-success').removeClass('alert-info').removeClass(
              'alert-warning').removeClass('alert-inverse').addClass(
              'alert-' + alert_type).html(msg);
      $('#ajaxMessages').css('display', 'block');
    }
  }

  _super.showChart = function(status) {
    if (status) {
      $("#nodata").hide();
      $("#frame").show();
      $("#result").show();
    } else {
      $("#nodata").show();
      $("#frame").hide();
      $("#result").hide();
    }
    $("#loading_data").hide();
  }
}

// ///////////////////////////////////////////////////////////////////////////////
// [ make lineChart ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.lineChart = function(chartElem, resultset, cb) {
  var _super = this;
  var lc = {};

  lc.main_y = {};
  lc.main_line = {};
  lc.main;

  lc.main_width = _super.config.lineChart.main.margin.width
      - _super.config.lineChart.main.margin.left
      - _super.config.lineChart.main.margin.right;
  lc.main_height = _super.config.lineChart.main.margin.height
      - _super.config.lineChart.main.margin.top
      - _super.config.lineChart.main.margin.bottom;

  lc.main_x = d3.time.scale().range([ 0, lc.main_width ]);

  lc.mainChartElem = chartElem;

  lc.getRangeData = function(json) {
    var data = new Array();
    if (_super.extent) {
      for (var i = 0; i < json.length; i++) {
        if (json[i].date >= _super.extent[0]
            && json[i].date <= _super.extent[1]) {
          data.push(json[i]);
        }
      }
    } else {
      data = jQuery.extend(true, [], json);
    }
    return data;
  }

  // make chartData for Chart
  lc.getData = function(resultset) {
    return _super.getStateData(resultset, 'average');
  }

  if (!_super.lineData) {
    _super.lineData = lc.getData(resultset);
  }

  _super.metrices = {};
  for ( var key in _super.lineData[0]) {
    if (key != 'date') {
      _super.metrices[key] = key;
    }
  }

  lc.combo = function(ds, id, all, cb) {
    id = '#' + id;
    var select = $(id);
    if (select.length > 0) {
      var options;
      if (select.prop) {
        options = select.prop('options');
      } else {
        options = select.attr('options');
      }
      $('option', select).remove();
      if (all) {
        if ('*' == _super.config.lineChart.combo.init) {
          options[options.length] = new Option('Select', '*', true, true);
        } else {
          options[options.length] = new Option('Select', '*', false);
        }
      }
      $.each(ds, function(key, obj) {
        if (key != 'date') {
          if (key == _super.config.lineChart.combo.init) {
            options[options.length] = new Option(_super
                .getLabelName(key, 'mid'), key, true, true);
          } else {
            options[options.length] = new Option(_super
                .getLabelName(key, 'mid'), key, false);
          }
        }
      });
      select.change(function(e) {
        try {
          cb.call(e, $(id).val());
        } catch (e) {
        }
      });
    }
  }

  lc.combo(_super.metrices, _super.config.lineChart.combo.id, false, function(
      metric) {
    if (_super.selectedTab() == 'Response') {
      if (metric == 'tot_ms') {
        _super.metric = null;
        metric = 'tot_ms';
      } else {
        _super.metric = metric;
      }
    } else {
      _super.metric = metric;
      _super.map.metric = metric;
    }
    var loc = $('#locs').val();
    if (loc == '*') {
      loc = null;
    }
    _super.loc = loc;
    _super.update(null, metric);
  });

  lc.init = function() {
    lc.main_y = {};
    lc.main_line = {};
    lc.main = {};
  }

  lc.brush = function() {
    _super.lc.main_x.domain(_super.extent);
    for ( var key in _super.lc.main_y) {
      if (_super.lc.main_line[key]) {
        _super.lc.main.select(".line" + key)
            .attr("d", _super.lc.main_line[key]);
      }
    }
    _super.lc.main.select(".x.axis").call(_super.lc.main_xAxis);
  }

  lc.update = function(data, metric, cb) {
    if (d3.selectAll('#lineSvg').length >= 1) {
      d3.selectAll('#lineSvg').remove();
      lc.lineSvg = d3.select(lc.mainChartElem).append("svg").attr("id",
          'lineSvg').attr("width", _super.config.lineChart.main.margin.width)
          .attr("height", _super.config.lineChart.main.margin.height);
    }

    lc.lineSvg.append("defs").append("clipPath").attr("id", "clip").append(
        "rect").attr("width", lc.main_width).attr("height", lc.main_height);

    lc.main = lc.lineSvg.append("g").attr(
        "transform",
        "translate(" + _super.config.lineChart.main.margin.left + ","
            + _super.config.lineChart.main.margin.top + ")");
    lc.main_xAxis = d3.svg.axis().scale(lc.main_x).tickFormat(
        d3.time.format(_super.axisFormat)).orient("bottom");

    data.forEach(function(d) {
      try {
        var dt = _super.parseDate(d.date);
        d.date = dt;
      } catch (e) {
      }
      for ( var key in data[0]) {
        if (key != 'date') {
          // if (key == 'judge' || key == 'nsl_ms') {
          d[key] = +d[key];
        }
      }
    });

    var left_y;
    if (metric != '*') {
      left_y = metric;
    } else {
      left_y = _super.config.lineChart.main.yAxis.left;
      for ( var key in data[0]) {
        if (key != 'date') {
          lc.main_y[key] = d3.scale.sqrt().range([ lc.main_height, 0 ]);
        }
      }
    }
    lc.main_y[left_y] = d3.scale.linear().rangeRound([ lc.main_height, 5 ]);
    if (left_y != 'judge') {
      lc.main_y['judge'] = d3.scale.linear().rangeRound([ lc.main_height, 5 ]);
    }

    // /[ line definition ]///////////////////////////
    var chart_type;
    // I need to enumerate instead of above fancy way.
    for ( var key in lc.main_y) {
      if (key == 'judge') {
        chart_type = 'step';
      } else {
        chart_type = _super.config.lineChart.main.type;
      }
      lc.main_line[key] = d3.svg.line().interpolate(chart_type).x(function(d) {
        return lc.main_x(d.date);
      }).y(function(d) {
        return lc.main_y[key](d[key]);
      });
    }

    lc.main_x.domain([ data[0].date, data[data.length - 1].date ]);
    for ( var key in lc.main_y) {
      lc.main_y[key].domain(d3.extent(data, function(d) {
        return d[key];
      }));
    }

    // /[ main lineChart ]///////////////////////////
    for ( var key in lc.main_y) {
      lc.main.append("path").datum(data).attr("clip-path", "url(#clip)").attr(
          "class", "line line" + key).attr("d", lc.main_line[key]).attr(
          "data-legend", function(d) {
            return key;
          });
      if (key == 'judge') {
        chart_type = 'step';
      } else {
        chart_type = _super.config.lineChart.main.type;
      }
      var area = d3.svg.area().interpolate(chart_type).x(function(d) {
        return lc.main_x(d.date);
      }).y0(lc.main_height).y1(function(d) {
        if (key == 'judge') {
          if (!d[key] || d[key] == 0) {
            return lc.main_y[key](1);
          } else {
            return lc.main_y[key](0);
          }
        } else {
          return lc.main_y[key](d[key]);
        }
      });
      lc.main.append("path").datum(data).attr("class", "line area" + key).attr(
          "d", area);
    }

    // /[ main left x ]///////////////////////////
    lc.main.append("g").attr("class", "x axis").attr("fill", "#585956").attr(
        "transform", "translate(0," + lc.main_height + ")").call(lc.main_xAxis);
    // /[ main left y ]///////////////////////////
    var main_yAxisLeft = d3.svg.axis().scale(lc.main_y[left_y]).orient("left");
    var unit;
    if (left_y == 'state') {
      unit = '(%)';
    } else {
      unit = '(ms)';
    }
    lc.main.append("g").attr("class", "y axis").attr("fill", "#585956").call(
        main_yAxisLeft).append("text").attr("transform", "translate(5, -25)")
        .attr("y", 12).attr("dy", ".71em").style("text-anchor", "end").text(
            unit);
    // /[ main right y ]///////////////////////////
    if (left_y != _super.config.lineChart.main.yAxis.right) {
      if (lc.main_y[_super.config.lineChart.main.yAxis.right]) {
        var main_yAxisRight = d3.svg.axis().scale(
            lc.main_y[_super.config.lineChart.main.yAxis.right])
            .orient("right");
        lc.main.append("g").attr("class", "y axis").attr("fill", "#585956")
            .attr("transform", "translate(" + lc.main_width + ", 0)").call(
                main_yAxisRight).append("text").attr("x", 16).attr("y", -15)
            .attr("dy", ".71em").style("text-anchor", "end").text("(%)");
      }
    }

    // /[ legend ]///////////////////////////
    var legend = lc.main.append("g").attr("class", "legend").attr("transform",
        "translate(0, " + _super.config.legend.y + ")").call(_super.legend,
        lc.mainChartElem, metric);

    // /[ focus ]///////////////////////////
    var focus = lc.main.append("g").attr("class", "focus").style("display",
        "none");
    for ( var key in lc.main_y) {
      focus.append("line").attr("class", "y" + key).attr("x1",
          lc.main_width - 6).attr("x2", lc.main_width + 6);
      focus.append("circle").attr("class", "y" + key).attr("r", 4);
      focus.append("text").attr("class", "y" + key).attr("fill", "#585956")
          .attr("dy", "-1em");
    }

    var bisectDate = d3.bisector(function(d) {
      return d.date;
    }).left;
    var formatDate2 = d3.time.format("%H:%M:%S");

    var mousemove = function() {
      var metric = $('#' + _super.config.lineChart.combo.id).val();
      var x0 = lc.main_x.invert(d3.mouse(this)[0]), i = bisectDate(data, x0, 1), d0 = data[i - 1];
      var d1 = data[i];
      if (d1 && d1.date) {
        var d = x0 - d0.date > d1.date - x0 ? d1 : d0;
        for ( var key in lc.main_y) {
          if (metric == '*') {
            continue;
          } else if (metric == 'state' || metric == 'judge') {
          } else {
            if (key == 'state' || key == 'judge') {
              continue;
            }
          }
          var y = lc.main_y[key](d[key]);
          focus.select("circle.y" + key).attr("transform",
              "translate(" + lc.main_x(d.date) + "," + y + ")");
          if (key == 'state') {
            var descript = '*****************************************************\n';
            descript += '[ Availability: metric / (active + include)\n';
            descript += '[ Average: (MAX - SUM) / MAX * 100 ]\n';
            var sum = 0;
            for (var i = 0; i < _super.metric_data.length; i++) {
              var type = _super.metric_data[i].target;
              var j = 0;
              for (j = 0; j < _super.metric_data[i].datapoints.length; j++) {
                if (_super.toUTCString(new Date(
                    _super.metric_data[i].datapoints[j][1] * 1000)) == d.date
                    .toString()) {
                  break;
                }
              }
              if (j > 0 && _super.metric_data[i].description[j]) {
                var active = _super.metric_data[i].description[j].v1;
                var metric = _super.metric_data[i].description[j].v2;
                var include = _super.metric_data[i].description[j].v3;
                if (!include)
                  include = 0;
                var avail = Math.floor((metric / (active + include)));
                if (isNaN(avail) || avail == Number.POSITIVE_INFINITY) {
                  avail = 0;
                }
                sum += avail;
                descript += ' - ' + _super.getLabelName(type, 'full') + ' : '
                    + avail + ' = ' + Number((metric).toFixed(1)) + '/ ('
                    + active + ' + ' + include + ') \n';
              }
            }
            var uptime_per = (_super.state_max - sum) / _super.state_max * 100;
            if (uptime_per) {
              uptime_per = Number((uptime_per).toFixed(1));
            } else {
              uptime_per = 0;
            }
            descript += ' - SUM: ' + sum + ' \n';
            descript += ' - MAX: ' + _super.state_max + ' \n';
            descript = '[' + _super.fullFormatDate(d.date) + '`s ' + key
                + ']: \n' + uptime_per + ' = (' + _super.state_max + '-' + sum
                + ') / ' + _super.state_max + ' * 100\n' + descript;
            _super.tooltip(descript, 250);
          }
          var formatOutput = _super.getLabelName(key) + " - "
              + formatDate2(d.date) + " - " + d[key];
          focus.select("text.y" + key).attr(
              "transform",
              "translate(" + lc.main_x(d.date) + "," + lc.main_y[key](d[key])
                  + ")").text(formatOutput);
          focus.select(".y" + key).attr(
              "transform",
              "translate(" + lc.main_width * -1 + ", " + lc.main_y[key](d[key])
                  + ")").attr("x2", lc.main_width + lc.main_x(d.date));
        }
        focus.select(".x").attr("transform",
            "translate(" + lc.main_x(d.date) + ", 0)");
      }
    }

    lc.main.append("rect").attr("class", "overlay")
        .attr("width", lc.main_width).attr("height", lc.main_height).on(
            "mouseover", function() {
              focus.style("display", null);
              d3.select("body").select('div.tooltip').remove();
            }).on("mouseout", function() {
          focus.style("display", "none");
          d3.select("body").select('div.tooltip').remove();
        }).on("mousemove", mousemove).on("click", function() {
          _super.debug(JSON.stringify(data));
        });

    if (cb) {
      cb.call();
    }
  }

  // "nsl_ms" : "DNS Time", // DNS Lookup
  // "con_ms" : "Connect Time", // Time To Connect
  // "tfb_ms" : "Wait Time", // Time To 1st Byte
  // "tot_ms" : "Response Time", // Roundtrip Time
  // "state" : "Service State",
  // "judge" : "Up/Down"

  if (d3.selectAll('#lineSvg').length >= 1) {
    d3.selectAll('#lineSvg').remove();
  }
  lc.lineSvg = d3.select(lc.mainChartElem).append("svg").attr("id", 'lineSvg')
      .attr(
          "width",
          lc.main_width + _super.config.lineChart.main.margin.left
              + _super.config.lineChart.main.margin.right).attr(
          "height",
          lc.main_height + _super.config.lineChart.main.margin.top
              + _super.config.lineChart.main.margin.bottom);
  lc.update(lc.getRangeData(_super.lineData),
      _super.config.lineChart.combo.init);

  _super.lc = lc;
  cb.call(null, _super.lineData);

  return lc;
}

UptimeChart.prototype.miniLineChart = function(chartElem, resultset, cb) {
  var _super = this;

  var mc = {};
  mc.miniChartElem = chartElem;
  mc.mini_y = {};
  mc.mini_line = {};
  mc.mini;

  mc.mini_width = _super.config.lineChart.mini.margin.width
      - _super.config.lineChart.mini.margin.left
      - _super.config.lineChart.mini.margin.right;

  mc.mini_height = _super.config.lineChart.mini.margin.height
      - _super.config.lineChart.mini.margin.top
      - _super.config.lineChart.mini.margin.bottom;

  mc.mini_x = d3.time.scale().range(
      [ 0, _super.config.lineChart.mini.margin.width ]);

  if (_super.lineData) {
    _super.lineData = _super.lc.getData(resultset);
  }

  var metrices = {};
  for ( var key in _super.lineData[0]) {
    if (key != _super.config.lineChart.main.yAxis.right) {
      metrices[key] = key;
    }
  }

  mc.init = function() {
    _super.mc.mini_y = {};
    _super.mc.mini_line = {};
    _super.mc.mini = {};
  }

  mc.update = function(data, metric) {
    if (d3.selectAll('#mlSvg').length >= 1) {
      d3.selectAll('#mlSvg').remove();
      mc.mlSvg = d3.select(mc.miniChartElem).append("svg").attr("id", "mlSvg")
          .attr("width", _super.config.lineChart.mini.margin.width).attr(
              "height", _super.config.lineChart.mini.margin.height).attr(
              "class", "miniSvg-component");
    }

    mc.mlSvg.append("defs").append("clipPath").attr("id", "clip")
        .append("rect").attr("width", _super.lc.main_width).attr("height",
            _super.mc.mini_height);

    mc.mini = mc.mlSvg.append("g").attr(
        "transform",
        "translate(" + _super.config.lineChart.mini.margin.left + ","
            + _super.config.lineChart.mini.margin.top + ")");

    mc.brushEvent = function(extent) {
      if (extent) {
        _super.extent = extent;
      } else {
        _super.extent = _super.mc.brush.empty() ? _super.mc.mini_x.domain()
            : _super.mc.brush.extent();
      }
    }

    mc.showBrush = function() {
      setTimeout(function() {
        if (!_super.brush) {
          var width = parseInt(_super.mc.mlSvg.selectAll(".background").attr(
              "width"));
          var brushed = width * (_super.config.lineChart.main.range / 100);
          _super.brush = {
            x : (width - brushed),
            width : brushed
          };
        }
        if (_super.brush) {
          _super.mc.mlSvg.selectAll(".extent").attr("x", _super.brush.x).attr(
              "width", _super.brush.width);
          mc.mlSvg.selectAll(".extent").style({
            fill : "yellow",
            visibility : "visible"
          })
          mc.mlSvg.selectAll(".resize rect").style({
            fill : "yellow",
            visibility : "visible"
          })
        }
      }, 100);
    }

    var brushstart = function() {
    }

    var brushend = function() {
      _super.brush = {
        x : mc.mlSvg.selectAll(".extent").attr("x"),
        width : mc.mlSvg.selectAll(".extent").attr("width")
      };
      mc.showBrush();
      _super.update();
    }
    mc.brush = d3.svg.brush().x(mc.mini_x).on("brush", mc.brushEvent).on(
        'brushstart', brushstart).on('brushend', brushend);

    data.forEach(function(d) {
      try {
        var dt = _super.parseDate(d.date);
        d.date = dt;
      } catch (e) {
      }
      for ( var key in data[0]) {
        if (key != 'date') {
          // if (key == 'judge' || key == 'nsl_ms') {
          d[key] = +d[key];
        }
      }
    });

    var left_y;
    if (metric != '*') {
      left_y = metric;
    } else {
      left_y = _super.config.lineChart.main.yAxis.left;
      for ( var key in _super.lc.main_y) {
        mc.mini_y[key] = d3.scale.linear().rangeRound([ mc.mini_height, 0 ]);
      }
    }
    mc.mini_y[left_y] = d3.scale.linear().rangeRound([ mc.mini_height, 0 ]);
    if (left_y != 'judge') {
      mc.mini_y['judge'] = d3.scale.linear().rangeRound([ mc.mini_height, 0 ]);
    }

    // /[ line definition ]///////////////////////////
    var chart_type;
    for ( var key in mc.mini_y) {
      if (key == 'judge') {
        chart_type = 'step';
      } else {
        chart_type = _super.config.lineChart.mini.type;
      }
      mc.mini_line[key] = d3.svg.line().interpolate(chart_type).x(function(d) {
        return _super.mc.mini_x(d.date);
      }).y(function(d) {
        return mc.mini_y[key](d[key]);
      });
    }
    mc.mini_x.domain(_super.range);
    for ( var key in mc.mini_y) {
      mc.mini_y[key].domain(d3.extent(data, function(d) {
        return d[key];
      }));
    }

    // /[ mc.mini lineChart ]///////////////////////////
    mc.mini_xAxis = d3.svg.axis().scale(mc.mini_x).tickFormat(
        d3.time.format(_super.axisFormat)).orient("bottom");

    mc.mini.append("g").attr("class", "x axis").attr("fill", "#585956").attr(
        "transform", "translate(0," + mc.mini_height + ")").call(mc.mini_xAxis);
    for ( var key in _super.lc.main_y) {
      mc.mini.append("path").datum(data).attr("class", "line area").attr("d",
          mc.mini_line[key]);
      if (key == 'judge') {
        chart_type = 'step';
      } else {
        chart_type = _super.config.lineChart.main.type;
      }
      var area = d3.svg.area().interpolate(chart_type).x(function(d) {
        return mc.mini_x(d.date);
      }).y0(mc.mini_height).y1(function(d) {
        if (key == 'judge') {
          if (!d[key] || d[key] == 0) {
            return mc.mini_y[key](1);
          } else {
            return mc.mini_y[key](0);
          }
        } else {
          return mc.mini_y[key](d[key]);
        }
      });
      mc.mini.append("path").datum(data).attr("class", "line area" + key).attr(
          "d", area);
    }
    mc.mini.append("g").attr("class", "x brush").call(mc.brush).selectAll(
        "rect").attr("y", -6).attr("height", mc.mini_height + 7);

    mc.showBrush();
  }
  _super.mc = mc;

  mc.update(_super.lineData, _super.config.lineChart.combo.init);

  cb.call(null, _super.lineData);
}

// ///////////////////////////////////////////////////////////////////////////////
// [ map chart ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.mapChart = function(mapElem, resultset, metric) {
  var _super = this;

  var map = {};
  map.states;
  map.circles;
  map.labels;
  map.mapElem = mapElem;
  map.metric = metric;

  var data = resultset.data.metric;
  var locs = resultset.meta.locs;

  // make mapData for lineChart from maxtrix, locs
  map.getData = function(resultset, metric) {
    data = _super.getStateData(resultset);
    locs = resultset.meta.locs;
    var active = resultset.data.active;
    if (metric == null || metric == '*') {
      if (_super.selectedTab() == 'Response') {
        metric = 'tot_ms';
      } else {
        metric = 'state';
      }
    }
    var activeLoc = new Array();
    for (var i = 0; i < active.length; i++) {
      var bChk = false;
      for (var j = 0; j < active[i].datapoints.length; j++) {
        if (active[i].datapoints[j][0] && active[i].datapoints[j][0] > 0) {
          bChk = true;
          break;
        }
      }
      if (bChk) {
        activeLoc[activeLoc.length] = active[i].target;
      }
    }
    var mapData = new Array();
    for (var i = 0; i < locs.length; i++) {
      var loc = locs[i].loc;
      if (activeLoc.indexOf(loc) > -1) {
        var row = {};
        row.loc = loc;
        row.metric = metric;
        row.latitude = locs[i].latitude;
        row.longitude = locs[i].longitude;
        for (var j = 0; j < data.length; j++) {
          if (data[j].loc == loc) {
            if (!row.datapoints) {
              row.datapoints = new Array();
            }
            row.datapoints.push(data[j]);
          }
        }
        if (Object.keys(row).length > 3) {
          mapData.push(row);
        }
      }
    }

    for (var i = 0; i < locs.length; i++) {
      var loc = locs[i].loc;
      if (activeLoc.indexOf(loc) > -1) {
        var bExist = false;
        for (var j = 0; j < mapData.length; j++) {
          if (mapData[j].loc == loc) {
            bExist = true;
            break;
          }
        }
        if (!bExist) {
          var row = {};
          row.loc = loc;
          row.latitude = locs[i].latitude;
          row.longitude = locs[i].longitude;
          for ( var key in mapData[0]) {
            if (key != 'loc' && key != 'latitude' && key != 'longitude'
                && key != 'metric' && key != 'key') {
              row[key] = 0;
            }
          }
          mapData.push(row);
        }
      }
    }

    if (_super.loc) {
      var data2 = new Array();
      if (_super.loc != '*') {
        var data = mapData;
        for (var i = 0; i < data.length; i++) {
          if (data[i].loc == _super.loc) {
            data2[data2.length] = data[i];
          }
        }
      }
      mapData = data2;
    }

    return mapData;
  }

  map.mapData = map.getData(resultset, map.metric);

  _super.mapCombo(locs, _super.config.map.combo.id, function(loc) {
    if (loc == '*') {
      loc = null;
    }
    _super.loc = loc;
    _super.createChart();
  });

  map.getCircleSize = function(d, loc) {
    var val = Math.round(map.getCircleTotal(d, loc));
    var s = 8;
    for ( var key in _super.config.map.circle) {
      if (val == 100) {
        s = 8;
      } else if (val > 90 && val < 100) {
        s = 12;
      } else if (val == 0) {
        s = 7;
      } else {
        s = 15;
      }
    }
    return s;
  }

  map.getCircleColor = function(d, loc) {
    var size = map.getCircleSize(d, loc);
    var color = '#81bc00';
    for ( var key in _super.config.map.circle) {
      var val = _super.config.map.circle[key];
      if (size >= val) {
        color = key;
      }
    }
    return color;
  }

  map.getCircleTotal = function(d, loc) {
    if (loc) {
      for (var i = 0; i < d.length; i++) {
        if (d[i].loc == loc) {
          d = d[i];
          break;
        }
      }
    }
    var val = 0;
    var cnt = 0;
    if (map.metric == 'judge') {
      for ( var key in d) {
        if (key != 'loc' && key != 'latitude' && key != 'longitude'
            && key != 'metric' && key != 'key') {
          for (var i = 0; i < d[key].length; i++) {
            if (!parseFloat(d[key][i][map.metric])
                || parseFloat(d[key][i][map.metric]) == 0) {
              val++;
            }
          }
        }
      }
    } else {
      for ( var key in d) {
        if (key != 'loc' && key != 'latitude' && key != 'longitude'
            && key != 'metric' && key != 'key') {
          for (var i = 0; i < d[key].length; i++) {
            if (parseFloat(d[key][i][map.metric]) > 0) {
              val += parseFloat(d[key][i][map.metric]);
              cnt++;
            }
          }
        }
      }
      if (cnt > 0) {
        val = val / cnt;
      }
    }
    return val;
  }

  _super.config.map.scale_bak = _super.config.map.scale;
  _super.config.map.margin.left_bak = _super.config.map.margin.left;
  map.navi = function(navi) {
    if (navi == 'zoom-in') {
      _super.config.map.scale = _super.config.map.scale * 1.2;
    } else if (navi == 'zoom-out') {
      _super.config.map.scale = _super.config.map.scale * 0.8;
    } else if (navi == 'home') {
      _super.config.map.scale = _super.config.map.scale_bak;
      _super.config.map.margin.left = _super.config.map.margin.left_bak;
    } else if (navi == 'fwd') {
      _super.config.map.margin.left = _super.config.map.margin.left + 30;
    } else if (navi == 'back') {
      _super.config.map.margin.left = _super.config.map.margin.left - 30;
    }
    map.update(map.mapData);
  }

  map.getBrushedData = function() {
    var json = new Array();
    var startTime = _super.extent[0];
    var endTime = _super.extent[1];
    console.log('startTime:' + startTime + '/endTime:' + endTime);
    if (_super.extent) {
      for (var i = 0; i < _super.map.mapData.length; i++) {
        var obj = {};
        for ( var key in _super.map.mapData[i]) {
          if (key == 'loc' || key == 'latitude' || key == 'longitude'
              || key == 'metric') {
            obj[key] = _super.map.mapData[i][key];
          } else {
            var datapoints = _super.map.mapData[i].datapoints;
            for (var j = 0; j < datapoints.length; j++) {
              var dt = datapoints[j].date;
              if (dt >= startTime && dt <= endTime) {
                if (!obj.datapoints) {
                  obj.datapoints = new Array();
                }
                obj.datapoints[obj.datapoints.length] = datapoints[j];
              }
            }
          }
        }
        json.push(obj);
      }
    } else {
      json = jQuery.extend(true, [], _super.map.mapData);
    }
    return json;
  }

  map.update = function(data, loc) {
    d3.select("[id='map']").remove();
    map.mapSvg = d3.select(map.mapElem).append("svg").attr('id', 'map').attr(
        "width", _super.config.map.margin.width).attr("height",
        _super.config.map.margin.height);
    map.states = map.mapSvg.append("g").attr("id", "states");
    var mapTool = d3.select('.map-top').html();
    d3.select('.map-top').remove();
    var div = d3.select("[id='graph']").append("div").attr('class', 'map-top')
        .html(mapTool);
    if (_super.width < 500) {
      $('.map-top').css({
        "top" : "-150px"
      });
    } else if (_super.width > 500) {
      $('.map-top').css({
        "top" : "-300px"
      });
    }

    var offset = [ _super.config.map.margin.left, _super.config.map.margin.top ];
    var projection = d3.geo.equirectangular().scale(_super.config.map.scale)
        .translate(offset);
    var path = d3.geo.path().projection(projection);
    d3.json("/assets/countries.json", function(data1) {
      map.states.selectAll("path").data(data1.features).enter().append("path")
          .attr("d", path).on(
              "mouseover",
              function(d) {
                d3.select(this).style("fill", "#6C0").append("title").text(
                    d.properties.name);
              }).on("mouseout", function(d) {
            d3.select(this).style("fill", "#ccc");
          })
      var zoom = d3.behavior.zoom().on(
          "zoom",
          function() {
            if (map.mapSvg.zoomable) {
              map.states.attr("transform", "translate("
                  + d3.event.translate.join(",") + ")scale(" + d3.event.scale
                  + ")");
              map.states.selectAll("circle").attr("d",
                  path.projection(projection));
              map.states.selectAll("path").attr("d",
                  path.projection(projection));
            }
          });
      map.mapSvg.on("click", function(d, i) {
        if (!map.mapSvg.zoomable) {
          map.mapSvg.zoomable = true;
        } else {
          map.mapSvg.zoomable = false;
        }
      })
      map.states.selectAll("circle").data(data).enter().append("g").append(
          "circle").style("stroke", "black").attr("cx", function(d, i) {
        return projection([ +d["longitude"], +d["latitude"] ])[0];
      }).attr("cy", function(d, i) {
        return projection([ +d["longitude"], +d["latitude"] ])[1];
      }).attr("r", function(d) {
        return _super.map.getCircleSize(d);
      }).on(
          "mouseover",
          function(d, i) {
            d3.select(this).style("fill", "#FC0");
            var html = '<div>';
            html += '<div>* Site: ' + _super.getLocName(d["loc"]);
            html += '</div>';
            var val = _super.map.getCircleTotal(d);
            if (val > 0) {
              html += '<div>* ' + _super.getLabelName(d.metric, 'full') + ': '
                  + Math.round(_super.map.getCircleTotal(d));
              if (d.metric != 'state') {
                html += ' (ms)';
              }
            }
            html += '</div></div>';
            var div = d3.select("body").append("div").attr('pointer-events',
                'none').attr("class", "map_tooltip").style("opacity", 1).html(
                html).style("left",
                (d3.event.pageX + _super.config.map.tooltip.x + "px")).style(
                "top", (d3.event.pageY + _super.config.map.tooltip.y + "px"));
          }).on("mouseout", function(d) {
        d3.select(this).style("fill", _super.map.getCircleColor(d));
        d3.select("body").select('div.map_tooltip').remove();
      }).style("fill", function(d) {
        return _super.map.getCircleColor(d);
      }).on("click", function() {
        _super.debug(JSON.stringify(data));
      });

      map.states.selectAll("labels").data(data).enter().append("text").attr(
          "fill", "#585956").attr("x", function(d, i) {
        return projection([ +d["longitude"], +d["latitude"] ])[0];
      }).attr("y", function(d, i) {
        return projection([ +d["longitude"], +d["latitude"] ])[1];
      }).attr("dy", "0.3em").attr("text-anchor", "middle").text(function(d, i) {
        return Math.round(_super.map.getCircleTotal(d));
      }).style({
        'fill' : 'red',
        'font' : '10px sans-serif'
      }).attr("d", path);
      map.mapSvg.call(zoom);
    });
  }
  _super.map = map;
  map.update(map.getBrushedData(), _super.config.map.combo.init);
  return map;
}

// [ draw map ]

// ///////////////////////////////////////////////////////////////////////////////
// [ gmap chart ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.gMap = function(gmapElem, data) {
  var _super = this;
  var gmap = {};

  gmap.gmapData = data;
  gmap.gmapElem = gmapElem;

  var locs = {};
  for (var i = 0; i < data.length; i++) {
    locs[data[i].loc] = data[i].loc;
  }

  _super.mapCombo(locs, _super.config.gmap.combo.id, function(val) {
    var data2 = new Array();
    if (val == '*') {
      data2 = gmap.gmapData;
    } else {
      for (var i = 0; i < data.length; i++) {
        if (data[i].loc == val) {
          data2[data2.length] = data[i];
        }
      }
    }
    gmap.drawGMap(data2, val);
  });

  gmap.drawGMap = function(data, loc) {
    var map = new google.maps.Map(d3.select(gmap.gmapElem).node(), {
      zoom : 2,
      center : new google.maps.LatLng(10, -350),
      mapTypeId : google.maps.MapTypeId.SATELLITE
    });

    var minZoomLevel = 2;
    google.maps.event.addListener(map, 'zoom_changed', function() {
      if (map.getZoom() < minZoomLevel)
        map.setZoom(minZoomLevel);
    });

    var overlay = new google.maps.OverlayView();

    overlay.onAdd = function() {
      d3.select("[id='" + gmap.gmapElem + "']").remove();
      var layer = d3.select(this.getPanes().overlayLayer).append("div").attr(
          'id', gmap.gmapElem).attr("class", "stations");

      overlay.draw = function() {
        var marker2 = layer.selectAll("svg").data(d3.entries(data)).each(
            transform).enter().append("svg:svg").each(transform);

        function transform(d) {
          d = d.value;
          if (100 == parseFloat(d.latitude))
            return;

          var marker = new google.maps.Marker({
            position : {
              lat : parseFloat(d.latitude),
              lng : parseFloat(d.longitude)
            },
            map : map,
            label : d.loc,
            title : d.loc
          });

          var contentString = '<div id="content">' + '<div id="siteNotice">'
              + '</div>' + '<h1 id="firstHeading" class="firstHeading">'
              + d.loc + '</h1>' + '<div id="bodyContent">' + '<p><b>' + d.loc
              + '</b> is a large Site.</p>'
              + '<a href="http://www.google.com">http://www.google.com</a> '
              + '(last visited June 22, 2016).</p>' + '</div>' + '</div>';

          var infowindow = new google.maps.InfoWindow({
            content : contentString,
            maxWidth : 200
          });
          marker.addListener('mouseover', function() {
            infowindow.open(map, marker);
          });
          // marker.addListener('mouseout', function() {
          // infowindow.close();
          // });

          var locCircle = new google.maps.Circle({
            strokeColor : '#FF0000',
            strokeOpacity : 0.8,
            strokeWeight : 2,
            fillColor : '#FF0000',
            fillOpacity : 0.35,
            map : map,
            label : d.loc,
            center : {
              lat : parseFloat(d.latitude),
              lng : parseFloat(d.longitude)
            },
            radius : Math.sqrt(100000000) * 100
          });

          var marker2 = new google.maps.Marker({
            position : {
              lat : parseFloat(d.latitude),
              lng : parseFloat(d.longitude)
            },
            map : map,
            optimized : false,
            icon : {
              url : '714_trans.gif',
              size : new google.maps.Size(100, 100),
              origin : new google.maps.Point(0, 0),
              anchor : new google.maps.Point(32, 32)
            },
            title : d.loc,
            zIndex : 0
          });

        }
      };
    };

    overlay.setMap(map);
  }

  _super.gmap = gmap;

  gmap.drawGMap(data, _super.config.gmap.combo.init);
}
// ///////////////////////////////////////////////////////////////////////////////
// [ make Histogram ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.histogramChart = function(id, data, cb) {
  var _super = this;
  var hst = {};

  var barColor = 'steelblue';
  function segColor(c) {
    return {
      nsl_ms : "#81bc00",
      con_ms : "#7e7f74",
      tfb_ms : "#ffa400"
    }[c];
  }

  hst.histogram = function(fD) {
    var hg = {};
    var width = _super.config.histogram.margin.width
        - _super.config.histogram.margin.left
        - _super.config.histogram.margin.right;
    var height = _super.config.histogram.margin.height;

    var x = d3.scale.ordinal().rangeRoundBands([ 0, width ], 0.1).domain(
        fD.map(function(d) {
          return d[0];
        }));

    _super.hgsvg.append("g").attr("class", "x axis").attr("fill", "#585956")
        .attr("transform", "translate(0," + height + ")").call(
            d3.svg.axis().scale(x).orient("bottom").tickValues(
                x.domain().filter(
                    function(d, i) {
                      if (fD.length > _super.config.histogram.max_bar) {
                        return !(i % Math.round(fD.length
                            / _super.config.histogram.max_bar));
                      }
                      return true;
                    })).tickFormat(d3.time.format(_super.axisFormat)));
    if (_super.metric) {
      return;
    }

    // _super.hgsvg.append("text").attr("x", 60).attr("y", 0 - (hgDim.top / 2))
    // .attr("text-anchor", "middle").style("text-decoration", "underline")
    // .text("Average Response Time");
    var y = d3.scale.linear().range([ height, 0 ]).domain([ 0, _super.sc.max ]);
    var bars = _super.hgsvg.selectAll(".bar").data(fD).enter().append("g")
        .attr("class", "bar");
    bars.append("rect").style("opacity", 0.2).attr("x", function(d) {
      return x(d[0]);
    }).attr("y", function(d) {
      return y(d[1]);
    }).attr("width", x.rangeBand()).attr("height", function(d) {
      return height - y(d[1]);
    }).attr('fill', barColor).style("cursor", "pointer").on("mouseover",
        mouseover).on("mouseout", mouseout).on("click", function() {
      _super.debug(JSON.stringify(fD));
    });

    bars.append("text").attr("fill", "#585956").text(function(d) {
      return d3.format(",")(d[1])
    }).attr("x", function(d) {
      return x(d[0]) + x.rangeBand() / 2;
    }).attr("y", function(d) {
      return y(d[1]) - 5;
    }).attr("text-anchor", "middle").style({
      'fill' : 'black',
      'font' : '10px sans-serif'
    });

    function mouseover(d) {
      var st = hst.fData.filter(function(s) {
        return s.date == d[0];
      })[0];
      var nd = d3.keys(st).map(function(s) {
        return {
          metric : s,
          sum : st[s]
        };
      });
      nd = nd.slice(1, nd.length - 1); // remove date & tot_ms
      hst.pc.update(nd);
      hst.lg.update(nd);
    }

    function mouseout(d) {
      hst.pc.update(hst.tf);
      hst.lg.update(hst.tf);
    }

    hg.update = function(nd, color) {
      y.domain([ 0, _super.sc.max ]);
      var bars = _super.hgsvg.selectAll(".bar").data(nd);
      bars.select("rect").style("opacity", 0.2).transition().duration(300)
          .attr("y", function(d) {
            return y(d[1]);
          }).attr("height", function(d) {
            return height - y(d[1]);
          }).attr("fill", color);

      if (fD.length < _super.config.histogram.max_bar) {
        bars.select("text").transition().duration(500).text(function(d) {
          return d3.format(",")(d[1])
        }).attr("y", function(d) {
          return y(d[1]) - 5;
        });
      }
    }
    return hg;
  }

  // function to handle pieChart.
  hst.pieChart = function(pD) {
    var pc = {};
    var pieDim = {
      width : 170,
      height : 120
    };
    pieDim.right = Math.min(pieDim.width, pieDim.height) / 2;
    var piesvg = d3.select(id).append("span").attr('class', 'flt')
        .append("svg").attr('id', 'piesvg').attr("width", pieDim.width).attr(
            "height", pieDim.height).append("g").attr("transform",
            "translate(120,60)");
    var arc = d3.svg.arc().outerRadius(pieDim.right - 10).innerRadius(0);
    var pie = d3.layout.pie().value(function(d) {
      return d.sum;
    });

    piesvg.selectAll("path").data(pie(pD)).enter().append("path")
        .attr("d", arc).each(function(d) {
          this._current = d;
        }).style("stroke", function(d) {
          return segColor(d.data.metric);
        }).style("opacity", 0.6).style("fill", function(d) {
          return segColor(d.data.metric);
        }).on("mouseover", mouseover).on("mouseout", mouseout).on("click",
            function() {
              _super.debug(JSON.stringify(pD));
            });

    pc.update = function(nd) {
      piesvg.selectAll("path").data(pie(nd)).transition().duration(500)
          .attrTween("d", arcTween);
    }
    function mouseover(d) {
      hst.hg.update(hst.fData.map(function(v) {
        return [ v.date, v[d.data.metric] ];
      }), segColor(d.data.metric));
    }
    function mouseout(d) {
      hst.hg.update(hst.fData.map(function(v) {
        return [ v.date, v.tot_ms ];
      }), barColor);
    }
    function arcTween(a) {
      var i = d3.interpolate(this._current, a);
      this._current = i(0);
      return function(t) {
        return arc(i(t));
      };
    }
    return pc;
  }

  hst.legend = function(lD2) {
    var tmp = {
      'mean' : -1,
      'metric' : 'name',
      'sum' : -1
    };
    var lD = new Array();
    lD.push(tmp);
    for (var i = 0; i < lD2.length; i++) {
      lD.push(lD2[i]);
    }
    var lg = {};
    var legendTb = d3.select(id).append("span").attr('class', 'frt').attr('id',
        'tr').append("table").attr('class', 'legendTb');
    var tr = legendTb.append("tbody").selectAll("tr").data(lD).enter().append(
        "tr");
    tr.append("td").append("svg").attr("width", '16').attr("height", '16')
        .append("rect").attr("width", '16').attr("height", '16').style(
            "opacity", 0.6).attr("fill", function(d) {
          if (d.mean >= 0) {
            return segColor(d.metric);
          } else {
            return '#FFFFFF';
          }
        });
    tr.append("td").attr("class", 'legendTbName').text(function(d) {
      if (d.mean >= 0) {
        return _super.getLabelName(d.metric) + ":";
      } else {
        return 'Matric';
      }
    });
    tr.append("td").attr("class", 'legendTbSum').text(function(d) {
      if (d.mean >= 0) {
        return d3.format(",")(d.sum);
      } else {
        return 'Sum';
      }
    });
    tr.append("td").attr("class", 'legendTbMean').text(function(d) {
      if (d.mean >= 0) {
        return d3.format(",")(Math.round(d.mean ? d.mean : 0));
      } else {
        return 'Mean';
      }
    });
    tr.append("td").attr("class", 'legendTbPerc').text(function(d) {
      if (d.mean >= 0) {
        return getLegend(d, lD);
      } else {
        return 'Percentage';
      }
    });

    lg.update = function(nd) {
      var l = legendTb.select("tbody").selectAll("tr").data(nd);
      l.select(".legendTbSum").text(function(d) {
        return d3.format(",")(d.sum);
      });
      l.select(".legendTbPerc").text(function(d) {
        return getLegend(d, nd);
      });
    }
    function getLegend(d, aD) {
      var val = (d.sum / d3.sum(aD.map(function(v) {
        return v.sum;
      })));
      if (isNaN(val)) {
        return d3.format("%")(0);
      } else {
        return d3.format("%")(val);
      }
    }
    return lg;
  }

  hst.update = function(data, cb) {
    d3.select("[id='piesvg']").remove();
    d3.selectAll("span.flt").remove();
    d3.selectAll("span.frt").remove();

    hst.fData = data;
    hst.fData.forEach(function(d) {
      d.tot_ms = d.nsl_ms + d.con_ms + d.tfb_ms;
    });

    hst.tf = [ 'nsl_ms', 'con_ms', 'tfb_ms' ].map(function(d) {
      return {
        metric : d,
        sum : d3.sum(hst.fData.map(function(t) {
          return t[d];
        })),
        mean : d3.mean(hst.fData.map(function(t) {
          return t[d];
        }))
      };
    });
    var sf = hst.fData.map(function(d) {
      return [ d.date, d.tot_ms ];
    });
    hst.hg = hst.histogram(sf);
    hst.pc = hst.pieChart(hst.tf);
    hst.lg = hst.legend(hst.tf);

    if (cb) {
      cb.call(null, data);
    }
  }

  // make data for hst.histogram
  hst.getData = function(json) {
    var data = new Array();
    if (_super.extent) {
      for (var i = 0; i < json.length; i++) {
        if (json[i].date >= _super.extent[0]
            && json[i].date <= _super.extent[1]) {
          data.push(json[i]);
        }
      }
    } else {
      data = jQuery.extend(true, [], json);
    }
    _super.rowcount = data.length;
    if (data.length == 0) {
      data = jQuery.extend(true, [], json);
    }
    var data2 = new Array();
    var date = 0;
    var nsl_ms = 0;
    var con_ms = 0;
    var tfb_ms = 0;
    var tot_ms = 0;
    var cnt = 0;
    var group_size = Math.round(data.length / _super.config.histogram.max_bar);
    if (data.length < _super.config.histogram.max_bar) {
      group_size = Math.round(data.length / 5);
    }
    for (var i = 0; i < data.length; i++) {
      if (i % group_size == 0 && i > 0) {
        var tmp = {};
        tmp.date = data[i].date;
        tmp.nsl_ms = Math.round(parseFloat(nsl_ms / group_size));
        tmp.con_ms = Math.round(parseFloat(con_ms / group_size));
        tmp.tfb_ms = Math.round(parseFloat(tfb_ms / group_size));
        data2.push(tmp);
        nsl_ms = 0;
        con_ms = 0;
        tfb_ms = 0;
      }
      nsl_ms += data[i].nsl_ms ? parseFloat(data[i].nsl_ms) : 0;
      con_ms += data[i].con_ms ? parseFloat(data[i].con_ms) : 0;
      tfb_ms += data[i].tfb_ms ? parseFloat(data[i].tfb_ms) : 0;
      tot_ms += data[i].tot_ms ? parseFloat(data[i].tot_ms) : 0;
      cnt++;
    }
    if (cnt > 0) {
      data2.tot_ms = Math.round(tot_ms / cnt);
    } else {
      data2.tot_ms = 0;
    }
    return data2;
  }

  if (data) {
    hst.update(data, cb);
  } else {
    hst.update(hst.getData(_super.lineData), cb);
  }

  _super.hst = hst;
  return hst;
}

// ///////////////////////////////////////////////////////////////////////////////
// [ make StackedChart ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.stackedChart = function(id, data, cb) {
  var _super = this;

  var sc = {};
  sc.stackedChartElem = id;
  sc.data = data;

  sc.update = function(data, cb) {
    var width = _super.config.stackedChart.margin.width
        - _super.config.stackedChart.margin.left
        - _super.config.stackedChart.margin.right
    var height = _super.config.stackedChart.margin.height
        - _super.config.stackedChart.margin.top
        - _super.config.stackedChart.margin.bottom;

    sc.stackedColor = d3.scale.ordinal().range(
        [ "#81bc00", "#7e7f74", "#ffa400" ]);

    sc.stackedColor.domain(d3.keys(data[0]).filter(function(key) {
      return key !== "date";
    }));

    data.forEach(function(d) {
      var y0 = 0;
      d.metrics = sc.stackedColor.domain().map(function(key) {
        return {
          date : d.date,
          key : key,
          y0 : y0,
          y1 : y0 += +d[key]
        };
      });
      d.total = d.metrics[d.metrics.length - 1].y1;
    });
    var x, y;
    sc.max = d3.max(data, function(d) {
      if (_super.metric) {
        return d[_super.metric];
      } else {
        return d.total;
      }
    });
    if (_super.config.stackedChart.type == 'line') {
      x = d3.time.scale().range([ 0, width ]);
      y = d3.scale.linear().range([ height, 0 ]).domain([ 0, sc.max ]);
      x.domain(d3.extent(data, function(d) {
        return d.date
      }))
    } else {
      sc.max = height;
      x = d3.scale.ordinal().rangeRoundBands([ 0, width ], .1);
      y = d3.scale.linear().rangeRound([ height, 0 ]);
      x.domain(data.map(function(d) {
        return d.date;
      }));
      y.domain([ 0, sc.max ]);
    }

    var xAxis = d3.svg.axis().scale(x).tickFormat(
        d3.time.format(_super.axisFormat)).orient("bottom");
    var yAxis = d3.svg.axis().scale(y).orient("left").tickFormat(
        d3.format(".2s"));

    d3.select("[id='" + sc.stackedChartElem + "']").remove();
    sc.stSvg = d3.select(sc.stackedChartElem).append("svg").attr("id",
        sc.stackedChartElem).attr("width",
        _super.config.stackedChart.margin.width).attr("height",
        _super.config.stackedChart.margin.height).append("g").attr(
        "transform",
        "translate(" + _super.config.stackedChart.margin.left + ","
            + _super.config.stackedChart.margin.top + ")");

    // sc.stSvg.append("g").attr("class", "x axis").attr("fill",
    // "#585956").attr(
    // "transform", "translate(0," + height + ")").call(xAxis);
    sc.stSvg.append("g").attr("class", "y axis").attr("fill", "#585956").call(
        yAxis).append("text").attr("transform", "translate(5, -25)").attr("y",
        10).attr("dy", ".71em").style("text-anchor", "end").text("(ms)");

    if (_super.config.stackedChart.type == 'line') {
      var newDataset = [ "con_ms", "nsl_ms", "tfb_ms" ].map(function(n) {
        return data.map(function(d, i) {
          return {
            x : d.date,
            y : !d[n] ? 0 : d[n],
            y0 : 0
          };
        });
      });
      d3.layout.stack()(newDataset);
      var area = d3.svg.area().x(function(d) {
        return x(d.x);
      }).y0(function(d) {
        return y(d.y0);
      }).y1(function(d) {
        return y(d.y + d.y0);
      });

      var stGroup = sc.stSvg.selectAll(".valgroup").data(newDataset).enter()
          .append("g").attr("class", "valgroup").style("fill", function(d, i) {
            return sc.stackedColor(i);
          }).attr("data-legend", function(d, i) {
            if (_super.metric) {
              return _super.metric;
            } else {
              return d3.keys(data[0])[i + 1];
            }
          }).style("opacity", 0.7);
      stGroup.append("path").attr("d", function(d) {
        return area(d);
      });
    } else {
      var barChart = sc.stSvg.selectAll(".date").data(data).enter().append("g")
          .attr("class", "g").attr("transform", function(d) {
            return "translate(" + x(d.date) + ",0)";
          });
      barChart.selectAll("rect").data(function(d) {
        return d.metrics;
      }).enter().append("rect").attr("width", x.rangeBand()).attr("y",
          function(d) {
            return y(d.y1);
          }).attr("data-legend", function(d) {
        if (_super.metric) {
          return _super.metric;
        } else {
          return d.key;
        }
      }).attr("height", function(d) {
        return y(d.y0) - y(d.y1);
      }).style("fill", function(d) {
        return sc.stackedColor(d.key);
      }).on("click", function(d) {
        _super.debug(JSON.stringify(sc.data));
      }).on("mouseover", function() {
        d3.select("body").select('div.tooltip').remove();
      }).on("mouseout", function() {
        d3.select("body").select('div.tooltip').remove();
      }).on(
          "mousemove",
          function(e) {
            var descript = '[Response Time] \n';
            descript += moment(e.date).format(_super.config.format.full_date)
                + ' \n';
            descript += '- ' + e.y1 + ' \n';
            _super.tooltip(descript, 150);
          });
    }
    _super.hgsvg = sc.stSvg;

    // /[ legend ]///////////////////////////
    var legend = sc.stSvg.append("g").attr("class", "legend").attr("transform",
        "translate(0, " + _super.config.legend.y + ")").call(_super.legend,
        sc.stackedChartElem, "*");

    _super.sc = sc;
    cb.call();
    return sc;
  }

  sc.getData = function(json) {
    var data = new Array();

    if (_super.extent) {
      for (var i = 0; i < json.length; i++) {
        if (json[i].date >= _super.extent[0]
            && json[i].date <= _super.extent[1]) {
          data.push(json[i]);
        }
      }
    } else {
      data = jQuery.extend(true, [], json);
    }
    if (data.length == 0) {
      data = jQuery.extend(true, [], json);
    }
    var input = new Array();
    data.forEach(function(d) {
      var tmp = {};
      if (d.tfb_ms > 0) {
        // console.log(d.date + '/' + d.tfb_ms);
      }
      tmp.date = d.date;
      if (_super.metric) {
        tmp[_super.metric] = d[_super.metric];
      } else {
        tmp.nsl_ms = d.nsl_ms ? d.nsl_ms : 0;
        tmp.con_ms = d.con_ms ? d.con_ms : 0;
        tmp.tfb_ms = d.tfb_ms ? d.tfb_ms : 0;
      }
      input.push(tmp);
    });

    input.forEach(function(d) {
      d.date = +d.date;
      if (_super.metric) {
        d[_super.metric] = +d[_super.metric];
      } else {
        d.nsl_ms = +d.nsl_ms;
        d.con_ms = +d.con_ms;
        d.tfb_ms = +d.tfb_ms;
      }
    });

    data = new Array();
    input.forEach(function(d) {
      var tmp = {};
      tmp.date = _super.toUTC(new Date(d.date * 1000));
      if (_super.metric) {
        tmp[_super.metric] = d[_super.metric];
      } else {
        tmp.nsl_ms = d.nsl_ms;
        tmp.con_ms = d.con_ms;
        tmp.tfb_ms = d.tfb_ms;
      }
      data.push(tmp);
    });
    return data;
  }

  sc.update(sc.getData(data), function() {
    cb.call();
  });
  _super.sc = sc;
}

// ///////////////////////////////////////////////////////////////////////////////
// [ make Gauge ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.gaugeChart = function(id, config) {
  var _super = this;

  var gauge = {};
  var defaultConfig = {
    size : 200,
    clipWidth : 150,
    clipHeight : 150,
    ringInset : 20,
    ringWidth : 20,

    pointerWidth : 8,
    pointerTailLength : 2,
    pointerHeadLengthPercent : 0.8,

    minValue : 0,
    maxValue : 300,

    minAngle : -90,
    maxAngle : 90,

    transitionMs : 2000,

    majorTicks : 5,
    labelFormat : d3.format(',g'),
    labelInset : 17,

    arcColorFn : d3.interpolateHsl(d3.rgb('#FFE8C6'), d3.rgb('#dc291e'))
  };

  var range;
  var r;
  var pointerHeadLength;
  var value = 0;

  var svg;
  var arc;
  var scale;
  var ticks;
  var tickData;
  var pointer;

  var donut = d3.layout.pie();

  function deg2rad(deg) {
    return deg * Math.PI / 180;
  }

  function newAngle(d) {
    var ratio = scale(d);
    var newAngle = defaultConfig.minAngle + (ratio * range);
    return newAngle;
  }

  gauge.configure = function(config) {
    var prop;
    for (prop in config) {
      defaultConfig[prop] = config[prop];
    }

    range = defaultConfig.maxAngle - defaultConfig.minAngle;
    r = defaultConfig.size / 2;
    pointerHeadLength = Math.round(r * defaultConfig.pointerHeadLengthPercent);

    scale = d3.scale.linear().range([ 0, 1 ]).domain(
        [ defaultConfig.minValue, defaultConfig.maxValue ]);

    ticks = scale.ticks(defaultConfig.majorTicks);
    tickData = d3.range(defaultConfig.majorTicks).map(function() {
      return 1 / defaultConfig.majorTicks;
    });

    arc = d3.svg.arc().innerRadius(
        r - defaultConfig.ringWidth - defaultConfig.ringInset).outerRadius(
        r - defaultConfig.ringInset).startAngle(function(d, i) {
      var ratio = d * i;
      return deg2rad(defaultConfig.minAngle + (ratio * range));
    }).endAngle(function(d, i) {
      var ratio = d * (i + 1);
      return deg2rad(defaultConfig.minAngle + (ratio * range));
    });
  };

  gauge.render = function(newValue) {
    d3.select("[id='gaugeSvg']").remove();
    svg = d3.select('#histogram').append("span").attr('class', 'gauge').attr(
        'id', 'gaugeSvg').append("svg").attr('width', defaultConfig.clipWidth)
        .attr('height', defaultConfig.clipHeight);
    var centerTx = function() {
      return 'translate(' + r + ',' + r + ')';
    }
    var arcs = svg.append('g').attr('class', 'arc').attr('transform', centerTx);
    arcs.selectAll('path').data(tickData).enter().append('path').attr('class',
        'gauge_stroke').attr('fill', function(d, i) {
      return defaultConfig.arcColorFn(d * i);
    }).attr('d', arc);
    var lg = svg.append('g').attr('class', 'label').attr('transform', centerTx);
    lg.selectAll('text').data(ticks).enter().append('text').attr(
        'transform',
        function(d) {
          var ratio = scale(d);
          var newAngle = defaultConfig.minAngle + (ratio * range);
          return 'rotate(' + newAngle + ') translate(0,'
              + (defaultConfig.labelInset - r) + ')';
        }).text(defaultConfig.labelFormat);

    var lineData = [ [ defaultConfig.pointerWidth / 2, 0 ],
        [ 0, -pointerHeadLength ], [ -(defaultConfig.pointerWidth / 2), 0 ],
        [ 0, defaultConfig.pointerTailLength ],
        [ defaultConfig.pointerWidth / 2, 0 ] ];
    var pointerLine = d3.svg.line().interpolate('step');
    var pg = svg.append('g').data([ lineData ]).attr('class', 'pointer').attr(
        'transform', centerTx);

    pointer = pg.append('path').attr('class', 'gauge_stroke').attr('d',
        pointerLine/* function(d) { return pointerLine(d) +'Z';} */).attr(
        'transform', 'rotate(' + defaultConfig.minAngle + ')');

    svg.append('g').attr('class', 'title').append("text").attr("x", 70).attr(
        "y", 105).attr("text-anchor", "middle").style("text-decoration",
        "underline").text("Response Time: ");

    gauge.update(newValue === undefined ? 0 : newValue);
  };

  gauge.update = function(newValue, newConfiguration) {
    if (newConfiguration !== undefined) {
      configure(newConfiguration);
    }
    var ratio = scale(newValue);
    var newAngle = defaultConfig.minAngle + (ratio * range);
    pointer.transition().duration(defaultConfig.transitionMs).ease('elastic')
        .attr('transform', 'rotate(' + newAngle + ')');

    d3.select("[id='art']").remove();
    svg.append('g').attr('class', 'art').attr("id", 'art').append("text").attr(
        "x", 125).attr("y", 105).attr("text-anchor", "middle").style(
        "text-decoration", "underline").text(newValue);

  };

  gauge.configure(config);

  _super.gauge = gauge;
  return gauge;
}

UptimeChart.prototype.selectView = function(tabId, json) {
  var _super = this;
  if (json) {
    _super.resultset = json;
  } else {
    json = _super.resultset;
  }
  _super.metric = null;
  if (!_super.isBrushed()) {
    _super.getExtent(json.data.avgActive[0].datapoints);
  }
  _super.closeDebug();
  json.meta.test_class = json.meta.test_class.toLowerCase();

  if (json.meta.test_class == 'http_get' || json.meta.test_class == 'http_post') {
    $('#response').show();
    _super.config.lineChart.main.yAxis.left = 'tot_ms';
    _super.lineChart("#lineChart", json, function(data) {
      if (tabId) {
        var active = $('#view').find("li.active");
        var inactive = $('#view').find("li.inactive");
        active.removeClass("active");
        active.addClass("inactive");
        inactive.removeClass("inactive");
        inactive.addClass("active");
      }
      if (_super.selectedTab() == 'Response') {
        $('.tot_ms_view').show();
        $('.state_view').hide();
        _super.lc.combo({
          nsl_ms : 'nsl_ms',
          con_ms : 'con_ms',
          tfb_ms : 'tfb_ms',
          tot_ms : 'tot_ms'
        }, _super.config.lineChart.combo.id, false);
        $('#' + _super.config.lineChart.combo.id).val("tot_ms");
        _super.miniLineChart("#minilineChart", json, function(data) {
        });
        _super.stackedChart('#stackedChart', data, function() {
          _super.histogramChart('#histogram', null, function(data) {
            var gauge = _super.gaugeChart('#gauge', uptimeConfig.gauge);
            gauge.render();
            gauge.update(data.tot_ms);
            setTimeout(function() {
              _super.brushRange();
            }, 100);
          });
        });
        _super.mapChart("#graph", json, 'tot_ms');
        d3.select("[id='#graph']").style('margin-top', -40);
        d3.select("[id='#gauge']").style('margin-top', 0);
      } else { // state
        $('.tot_ms_view').hide();
        $('.state_view').show();
        _super.lc
            .combo(_super.metrices, _super.config.lineChart.combo.id, true);
        $('#' + _super.config.lineChart.combo.id).val(
            _super.config.lineChart.combo.init);
        _super.miniLineChart("#minilineChart2", json, function(data) {
          if (_super.rowcount > 0) {
            _super.mc.brushEvent(_super.extent);
            setTimeout(function() {
              _super.brushRange();
            }, 100);
          }
        });
        _super.mapChart("#graph", json, 'state');
      }
    });
  } else {
    $('#response').hide();
    if (json.meta.test_class == 'Ping') {
      _super.config.lineChart.main.yAxis.left = 'rt_max';
    } else {
      _super.config.lineChart.main.yAxis.left = 'time_ms';
    }
    _super.lineChart("#lineChart", json, function(data) {
      $('.tot_ms_view').hide();
      $('.state_view').show();
      _super.lc.combo(_super.metrices, _super.config.lineChart.combo.id, true);
      $('#' + _super.config.lineChart.combo.id).val(
          _super.config.lineChart.combo.init);
      _super.miniLineChart("#minilineChart2", json, function(data) {
        if (_super.rowcount > 0) {
          _super.mc.brushEvent(_super.extent);
          setTimeout(function() {
            _super.brushRange();
          }, 100);
        }
      });
      _super.mapChart("#graph", json, 'state');
    });
  }
}

UptimeChart.prototype.createChart = function(ghcid) {
  var _super = this;

  if (ghcid) {
    _super.ghcid = ghcid;
    _super.ajaxMessage('clear', null);
  } else {
    var ghcid = _super.ghcid;
    if (!ghcid) {
      console.log('ghcid null!');
    }
  }

  console.time("query response time");
  $("#nodata").hide();
  $("#loading_data").show();
  $("#frame").hide();
  $("#result").hide();

  var gmetric = $("#gmetrices").val();
  var locs = $("#locs").val();

  var from = $("#from").val();
  var until = $("#until").val();

  if (!ghcid) {
    console.log('ghcid null!');
    var ghcid = '';
  }
  // make request url
  var req_url = '/statsdata/health_uptime?hc_id=' + ghcid;
  if (locs) {
    req_url += '&loc=' + locs;
  }
  if (from) {
    req_url += '&from=' + from;
  } else {
    req_url += '&from=' + $("#from").val();
  }
  if (until) {
    req_url += '&until=' + until;
  } else {
    req_url += '&until=' + $("#until").val();
  }
  $.get(
      req_url,
      function(rawJsonData) {
        if (rawJsonData.indexOf('>{') > -1) {
          rawJsonData = rawJsonData.substring(rawJsonData.indexOf('>{') + 1,
              rawJsonData.length);
        }
        var json = jQuery.parseJSON(rawJsonData);
        $("#csv_export")[0].target = req_url;
        console.log(json.meta.req_url);
        console.log(rawJsonData);
        if (json.data.metric.length == 0 || json.data.active.length == 0) {
          _super.showChart(false);
          $('.tot_ms_view').css({
            'height' : '100px'
          });
          $('#stats_date_range').html('');
          console.timeEnd("query response time");
          return;
        }
        var datapoints = json.data.active[0].datapoints;
        var date_start = _super.toUTC(new Date(datapoints[0][1] * 1000));
        var date_end = _super.toUTC(new Date(
            datapoints[datapoints.length - 1][1] * 1000));
        var rangeSpan = moment(date_start).format('DD MMM YYYY HH:mm UTC')
            + ' <span>to</span> '
            + moment(date_end).format('DD MMM YYYY HH:mm UTC');
        $('#stats_date_range').html(rangeSpan);

        $('.tot_ms_view').css({
          'height' : '450px'
        });
        _super.selectView(null, json);
        _super.showChart(true);
        console.timeEnd("query response time");
      }).error(
      function(XMLHttpRequest, textStatus, errorThrown) {
        try {
          var tmp = JSON.parse(XMLHttpRequest.responseText);
          var msg = (tmp && tmp.hasOwnProperty('message')) ? tmp.message
              : XMLHttpRequest.responseText;
          _super.ajaxMessage('error', 'Unable to load data: ' + msg);
          _super.showChart(false);
        } catch (e) {
          _super.ajaxMessage('error', 'Unable to load data from server!');
          from = '/assets/' + from.substring(1, from.length) + '.json';
          d3.json(from, function(error, json) {
            // d3.json('data.json', function(error, json) {
            if (!json) {
              if (!_super.ghcid) {
                _super.ghcid = '720';
              }
              d3.json('/assets/' + _super.ghcid + '_detail.json', function(
                  error, json) {
                if (json) {
                  console.log(json.meta.req_url);
                  console.log(json);
                  _super.selectView(null, json);
                  _super.showChart(true);
                  console.timeEnd("query response time");
                }
              });
            } else {
              setTimeout(function() {
                _super.selectView(null, json);
                _super.showChart(true);
              }, 1000);
            }
          });
        }
      });

  // window.onerror = function(msg, url, line, col, error) {
  // if (url == '') {
  // _super.ajaxMessage('error', 'internal error!');
  // _super.showChart(true);
  // }
  // var suppressErrorAlert = true;
  // return suppressErrorAlert;
  // };
}

UptimeChart.prototype.changeDate = function(from) {
  var _super = this;
  var m;
  if (from.indexOf('hour') > -1) {
    m = from.substring(0, from.indexOf('hour'));
    m = m * 60 * -1;
  } else if (from.indexOf('d') > -1) {
    m = from.substring(0, from.indexOf('d'));
    m = m * 60 * 24 * -1;
  } else if (from.indexOf('m') > -1) {
    m = from.substring(0, from.indexOf('m'));
    m = m * 30 * 60 * 24 * -1;
  }
  _super.addMinutes(m);
  _super.changeDateWithDatepair();
  _super.createChart();
};

UptimeChart.prototype.changeDateWithDatepair = function() {
  uc.ajaxMessage('clear', null);
  var from = $('#datepairElem .date.start').val() + ' '
      + $('#datepairElem .time.start').val();
  from = moment(from, "DD/MM/YYYY LT").format("DD/MM/YYYY HH:mm:ss");
  var until = $('#datepairElem .date.end').val() + ' '
      + $('#datepairElem .time.end').val();
  until = moment(until, "DD/MM/YYYY LT").format("DD/MM/YYYY HH:mm:ss");
  var now = moment().format("DD/MM/YYYY HH:mm:ss");
  var ms = moment(now, "DD/MM/YYYY HH:mm:ss").diff(
      moment(from, "DD/MM/YYYY HH:mm:ss"));
  var d = moment.duration(ms);
  var end = (Math.floor(d.asHours()) * 60) + parseInt(moment(ms).format("mm"));
  var ms = moment(now, "DD/MM/YYYY HH:mm:ss").diff(
      moment(until, "DD/MM/YYYY HH:mm:ss"));
  var d = moment.duration(ms);
  var start = (Math.floor(d.asHours()) * 60)
      + parseInt(moment(ms).format("mm"));
  if (start > end) {
    uc.ajaxMessage('error', 'Invalid date!');
    $('#datepairElem .date.start').val(uc.date_start);
    $('#datepairElem .date.end').val(uc.date_end);
    $('#datepairElem .time.start').val(uc.time_start);
    $('#datepairElem .time.end').val(uc.time_end);
    return;
  }
  $("#until").val(start * -1);
  $("#from").val(end * -1);

  uc.date_start = $('#datepairElem .date.start').val();
  uc.date_end = $('#datepairElem .date.end').val();
  uc.time_start = $('#datepairElem .time.start').val();
  uc.time_end = $('#datepairElem .time.end').val();

  if (end > uc.config.slider.range.max) {
    end = uc.config.slider.range.max;
  }
  if (end < 0) {
    end = uc.config.slider.range.min;
  }
  if (start > uc.config.slider.range.max) {
    start = uc.config.slider.range.max;
  }
  if (start < 0) {
    start = uc.config.slider.range.min;
  }
  if (uc.slider.values != [ start, end ]) {
    uc.slider([ start, end ]);
    uc.slider.values = [ start, end ];
  }
};

// ///////////////////////////////////////////////////////////////////////////////
// [ resize svg ]
// ///////////////////////////////////////////////////////////////////////////////
UptimeChart.prototype.resize = function() {
  var _super = this;

  _super.width = ($('.row').width() > 0) ? $('.row').width() : screen.width;
  var height = (window.innerHeight > 0) ? window.innerHeight : screen.height;

  _super.config.lineChart.main.margin.width = _super.width;
  _super.config.lineChart.mini.margin.width = _super.width - 80;
  _super.config.histogram.margin.width = _super.width;
  _super.config.stackedChart.margin.width = _super.width;
  _super.config.map.margin.width = _super.width;

  var device = '';
  if (_super.width < 360) {
    device = 'iphone_mini';
    _super.config.map.margin.height = 200;
    _super.config.map.margin.top = 130;
    _super.config.map.margin.left = 250;
    _super.config.map.scale = 90;
  } else if (_super.width >= 360 && _super.width <= 500) {
    device = 'nexus4'; // iphone6(391) iphone6_plus(429)
    _super.config.map.margin.height = 200;
    _super.config.map.margin.top = 130;
    _super.config.map.margin.left = 250;
    _super.config.map.scale = 90;
  } else if (_super.width > 500 && _super.width <= 700) {
    device = 'nexus7'; // 615
    _super.config.map.margin.height = 300;
    _super.config.map.margin.top = 150;
    _super.config.map.margin.left = 330;
    _super.config.map.scale = 95;
  } else if (_super.width > 700 && _super.width <= 900) {
    device = 'ipad'; // 768
    _super.config.map.margin.height = 400;
    _super.config.map.margin.top = 230;
    _super.config.map.margin.left = 380;
    _super.config.map.scale = 125;
  } else {
    device = 'desktop';
    _super.config.map.margin.height = 400;
    _super.config.map.margin.top = 250;
    _super.config.map.margin.left = 550;
    _super.config.map.scale = 150;
  }
  if (_super.device && device != _super.device) {
    _super.createChart();
  }
  console.log(_super.width + ' -> ' + device);
  _super.device = device;
}

// //////////////////////////////////////////////////////////////////////////////
// / [configuration]
// //////////////////////////////////////////////////////////////////////////////
var uptimeConfig = {
  "slider" : {
    "init" : {
      "x0" : 0,
      "x1" : 120
    },
    "range" : {
      "min" : 0,
      "max" : 120
    },
    "step" : 5
  },
  "lineChart" : {
    "main" : {
      "margin" : {
        "width" : 950,
        "height" : 250,
        "top" : 50,
        "bottom" : 20,
        "right" : 40,
        "left" : 40
      },
      "yAxis" : {
        "right" : "state"
      },
      "type" : "basis",
      "range" : 30
    },
    "mini" : {
      "margin" : {
        "width" : 870,
        "height" : 40,
        "top" : 0,
        "bottom" : 20,
        "right" : 0,
        "left" : 0
      },
      "type" : "monotone"
    },
    "combo" : {
      "id" : "gmetrices",
      "init" : "state"
    }
  },
  "histogram" : {
    "margin" : {
      "width" : 950,
      "height" : 175,
      "top" : 130,
      "bottom" : 0,
      "right" : 40,
      "left" : 40
    },
    "max_bar" : 20
  },
  "stackedChart" : {
    "type" : "line",
    "margin" : {
      "width" : 950,
      "height" : 250,
      "top" : 50,
      "bottom" : 25,
      "right" : 40,
      "left" : 40
    }
  },
  "gauge" : {
    "size" : 160,
    "clipWidth" : 160,
    "clipHeight" : 160,
    "ringWidth" : 60,
    "maxValue" : 700,
    "transitionMs" : 2000
  },
  "map" : {
    "margin" : {
      "width" : 950,
      "height" : 400,
      "top" : 100,
      "left" : 390
    },
    "circle" : {
      "#7e7f74" : 6,
      "#81bc00" : 8,
      "#dc291e" : 12,
      "#ffa400" : 15
    },
    "scale" : 135,
    "tooltip" : {
      "x" : 2,
      "y" : 2
    },
    "combo" : {
      "id" : "locs",
      "init" : "*"
    }
  },
  "gmap" : {
    "height" : 300,
    "width" : 950,
    "circle_scale" : 1,
    "scale" : 150,
    "tooltip" : {
      "x" : 20,
      "y" : 160
    },
    "combo" : {
      "id" : "glocs",
      "init" : "*"
    }
  },
  "legend" : {
    "x" : 9,
    "y" : -3,
    "width" : 18,
    "height" : 18
  },
  "mapping" : {
    "nsl_ms" : {
      "short" : "DNS Lookup",
      "full" : "DNS Lookup Time (ms)"
    },
    "con_ms" : {
      "short" : "DNS Connect",
      "full" : "DNS LookupTime To Connect (ms)"
    },
    "tfb_ms" : {
      "short" : "Waiting Time",
      "full" : "Time To 1st Byte (ms)"
    },
    "tot_ms" : {
      "short" : "Response",
      "full" : "Roundtrip Time (ms)"
    },
    "time_ms" : {
      "short" : "Response",
      "full" : "Roundtrip Time (ms)"
    },
    "rt_min" : {
      "short" : "Roundtrip Minimum",
      "full" : "Roundtrip Time Minimum (ms)"
    },
    "rt_max" : {
      "short" : "Roundtrip Maximum",
      "full" : "Roundtrip Time Maximum (ms)"
    },
    "rt_avg" : {
      "short" : "Roundtrip Average",
      "full" : "Roundtrip Time Average (ms)"
    },
    "rt_std" : {
      "short" : "Roundtrip Standard",
      "full" : "Roundtrip Time Standard (ms)"
    },
    "loss_" : {
      "short" : "Loss",
      "full" : "Loss Percentage (%)"
    },
    "state" : {
      "short" : "Service status",
      "full" : "Service status"
    },
    "judge" : {
      "short" : "Up Down",
      "full" : "Up Down status"
    }
  },
  "format" : {
    "full_date" : "DD/MM/YYYY HH:mm:ss"
  }
}

// ///////////////////////////////////////////////////////////////////////////////
// var uc = new UptimeChart(uptimeConfig);
// uc.createChart(1);


