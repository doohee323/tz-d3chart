var UptimeSparkline = function() {
  this.createChart = function(hc_id, element_id) {
    if (hc_id) {
      $.ajax({
        method : 'GET',
        url : '/cm/app/monitoring/home/uptime_list?hc_id=' + hc_id,
        dataType : 'json',
        'element_id' : element_id,
        'hc_id' : hc_id
      }).done(function(json) {
        createSparkline(this.element_id, json);
      }).fail(function(msg) {
        var from = '/assets/' + this.hc_id + '.json';
        var element_id = this.element_id;
        d3.json(from, function(error, json) {
          createSparkline(element_id, json);
        });
      })
    }
  }

  function createSparkline(element_id, data) {
    if (!data || !data.length) {
      $('#' + element_id).html(
          '<span class="text-danger">No data available</span>');
      return;
    }
    $('#' + element_id).html('');

    var key = 'time_ms';
    data.forEach(function(d) {
      d.date = new Date(d.date);
      if (isNaN(d[key])) {
        d[key] = 0;
      }
    });

    var oWidth = $('#' + element_id).css('width');
    oWidth = parseInt(oWidth.substring(0, oWidth.length - 2));
    var oHeight = $('#' + element_id).css('height');
    oHeight = parseInt(oHeight.substring(0, oHeight.length - 2));
    var margin = {
      top : 0,
      right : 0,
      bottom : 0,
      left : 0
    }, width = oWidth - margin.left - margin.right, height = oHeight
        - margin.top - margin.bottom;

    var oElem = d3.select('#' + element_id);
    var svg = oElem.append("svg").attr("id", element_id + '_svg').attr("width",
        width + margin.left + margin.right).attr("height",
        height + margin.top + margin.bottom).append("g").attr("transform",
        "translate(" + margin.left + "," + margin.top + ")");

    var x = d3.time.scale().range([ 0, width ]);
    var y = d3.scale.linear().range([ height, 0 ]);
    var xAxis = d3.svg.axis().scale(x).orient("bottom");
    var yAxis = d3.svg.axis().scale(y).orient("left");

    var area = d3.svg.area().x(function(d) {
      return x(d.date);
    }).y0(height).y1(function(d) {
      return y(d[key]);
    });

    x.domain([ data[0].date, data[data.length - 1].date ]);
    y.domain([ 0, d3.max(data, function(d) {
      return d[key];
    }) ]);

    var max = 0, min = 0, mean = 0;
    max = d3.max(data, function(d) {
      return d[key];
    });
    min = d3.min(data, function(d) {
      return d[key];
    });
    mean = d3.mean(data, function(d) {
      return d[key];
    });
    var lvl1 = mean - 1;
    var lvl2 = mean + 1;
    console.log(height + '/' + max + '/' + min + '/' + mean + '/' + lvl1 + '/'
        + lvl2);

    // gradient chart
    svg.append("linearGradient").attr("id", "sparkline-gradient").attr(
        "gradientUnits", "userSpaceOnUse").attr("x1", 0).attr("y1", y(lvl1))
        .attr("x2", 0).attr("y2", y(lvl2)).selectAll("stop").data([ {
          offset : "0%",
          color : "steelblue"
        }, {
          offset : "50%",
          color : "yellow"
        }, {
          offset : "100%",
          color : "red"
        } ]).enter().append("stop").attr("offset", function(d) {
          return d.offset;
        }).attr("stop-color", function(d) {
          return d.color;
        });

    svg.append("g").attr("class", "x axis").attr("transform",
        "translate(0," + height + ")").call(xAxis);

    svg.append("path").datum(data).attr("class", "area").attr("d", area);

    // line chart
    var valueline = d3.svg.line().x(function(d) {
      return x(d.date);
    }).y(function(d) {
      return y(d[key]);
    });
    svg.append("path").attr("class", "line").attr("d", valueline(data));

    // step chart
    var stepline = d3.svg.line().interpolate('step').x(function(d) {
      return x(d.date);
    }).y(function(d) {
      return y(d.judge);
    });

    svg.append("path").attr("class", "stepline area").attr("d", stepline(data));

  }

}
