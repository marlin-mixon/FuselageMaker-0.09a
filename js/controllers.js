'use strict';

/* Controllers */

angular.module('fuselageMaker.controllers', []).
controller('MyCtrl1', ['$scope', '$window', '$rootScope', function($scope, $window, $rootScope) {

$scope.version = '0.04a';
$scope.Math = window.Math;

$scope.set_xy_click = function(element) {
  element.x = $scope.theX;
  element.y = $scope.theY;
};
$scope.set_xy_arc_click = function(element) {
  element.push({x:$scope.theX, y:$scope.theY});
};
$scope.op_seq = [];
$scope.show_plan_image = true;
$scope.sst2 = {};
$scope.sst2.show_bulkheads = false;
$scope.sst = {
  side: {
    version: $scope.version,
    zone: {
      lower_left: {
        instruct: 'Click lower left corner of side view box zone',
        x: null,
        y: null,
      },
      upper_right: {
        instruct: 'Click upper right corner of side view box zone',
        x: null,
        y: null,
      }
    },
    reference_line: {
      nose: {
        instruct: 'Click on nose end of side reference line',
        x: null,
        y: null
      },
      tail: {
        instruct: 'Click on tail end of side reference line',
        x: null,
        y: null
      }
    },
    top_outline: [],
    bottom_outline: [],
    display: {
      bulk: [],
      xsec: []
    }
  },
  top: {
    zone: {
      lower_left: {
        instruct: 'Click lower left corner of top/bottom view box zone',
        x: null,
        y: null
      },
      upper_right: {
        instruct: 'Click upper right corner of top/bottom view box zone',
        x: null,
        y: null
      }
    },
    reference_line: {
      nose: {
        instruct: 'Click on nose end of top/bottom reference line',
        x: null,
        y: null
      },
      tail: {
        instruct: 'Click on tail end of top/bottom reference line',
        x: null,
        y: null
      },
    },
    left_outline: [],
    right_outline: [],
    display: {
      bulk: [],
      xsec: []
    }
  },
  xsecs: [],
  xsec: {
    is_dirty: false
  },
  bulkheads: []
};

$scope.set_3view = function() {
  $scope.set_display('select-background', true);
};
$scope.add_image = function(){
  var f = $rootScope.window.document.getElementById('background_file').files[0];
  var r = new FileReader();
  r.onloadend = function(e){
    var data = btoa(e.target.result);
    $scope.sst.background_3view = data;
    $scope.set_plan_image("img/p51_side.jpg", true)
    $scope.safe_apply();
  }
  r.readAsBinaryString(f);
};

$scope.set_fuselage = function() {
  $scope.set_display('select-fuselage', true);
};
$scope.add_fuselage = function(){
  var f = $rootScope.window.document.getElementById('fuselage_file').files[0];
  var r = new FileReader();
  r.onloadend = function(e){
    $scope.sst = JSON.parse(e.target.result);
    $scope.safe_apply();
  }
  r.readAsBinaryString(f);
};

$scope.checkLineIntersection = function(line1StartX, line1StartY, line1EndX, line1EndY, line2StartX, line2StartY, line2EndX, line2EndY) {
    // if the lines intersect, the result contains the x and y of the intersection (treating the lines as infinite) and booleans for whether line segment 1 or line segment 2 contain the point
    var denominator, a, b, numerator1, numerator2, result = {
        x: null,
        y: null,
        onLine1: false,
        onLine2: false
    };
    denominator = ((line2EndY - line2StartY) * (line1EndX - line1StartX)) - ((line2EndX - line2StartX) * (line1EndY - line1StartY));
    if (denominator == 0) {
        return result;
    }
    a = line1StartY - line2StartY;
    b = line1StartX - line2StartX;
    numerator1 = ((line2EndX - line2StartX) * a) - ((line2EndY - line2StartY) * b);
    numerator2 = ((line1EndX - line1StartX) * a) - ((line1EndY - line1StartY) * b);
    a = numerator1 / denominator;
    b = numerator2 / denominator;

    // if we cast these lines infinitely in both directions, they intersect here:
    result.x = line1StartX + (a * (line1EndX - line1StartX));
    result.y = line1StartY + (a * (line1EndY - line1StartY));
/*
        // it is worth noting that this should be the same as:
        x = line2StartX + (b * (line2EndX - line2StartX));
        y = line2StartX + (b * (line2EndY - line2StartY));
        */
    // if line1 is a segment and line2 is infinite, they intersect if:
    if (a > 0 && a < 1) {
        result.onLine1 = true;
    }
    // if line2 is a segment and line1 is infinite, they intersect if:
    if (b > 0 && b < 1) {
        result.onLine2 = true;
    }
    // if line1 and line2 are segments, they intersect if both of the above are true
    return result;
};

$scope.get_extents = function(shape) {
  var minx=999999;
  var miny=999999;
  var maxx=-999999;
  var maxy=-999999;
  for (var i=0;i<shape.length;i++) {
    if (shape[i].x > maxx) { maxx = shape[i].x; }
    if (shape[i].x < minx) { minx = shape[i].x; }
    if (shape[i].y > maxy) { maxy = shape[i].y; }
    if (shape[i].y < miny) { miny = shape[i].y; }
  }
  return {min_point: {x:minx,y:miny}, max_point: {x:maxx,y:maxy}}
}

$scope.dist = function(p1, p2) {
  var dx = p1.x - p2.x;
  var dy = p1.y - p2.y;
  return Math.sqrt(dx*dx + dy*dy) ;
}

$scope.add_flood_points_newest = function(xsec, n_total) {
  var i;
  // get total length
  var total_dist = 0;
  for (i=xsec.xsec.length-1;i>=1;i--) {
    if (xsec.xsec[i].x === xsec.xsec[i-1].x && xsec.xsec[i].y === xsec.xsec[i-1].y) {
      xsec.xsec.splice(i,1);  // remmove point because it's identical to neighbor
      continue;
    }
    var the_dist = $scope.dist({x:xsec.xsec[i].x, y:xsec.xsec[i].y},{x:xsec.xsec[i-1].x, y:xsec.xsec[i-1].y});
    if (the_dist === 0) {
      xsec.xsec.splice(i,1);  // remmove point because it's identical to neighbor
      continue;
    }
    total_dist += the_dist;
    xsec.xsec[i].dist = the_dist;
  }
  var n = n_total + xsec.xsec.length;
  // var n = n_total;
  var short_dist = total_dist / n;
  var flooded_xsec = [{x:xsec.xsec[0].x, y:xsec.xsec[0].y}];
  var accum_dist = short_dist;
  var ii;
  var accum_total_dist = 0;
  i = 1;
  for (i=1;i<xsec.xsec.length;i++) {
    var x1 = xsec.xsec[i-1].x;
    var y1 = xsec.xsec[i-1].y;
    var theta = Math.atan2( (xsec.xsec[i].y - y1), (xsec.xsec[i].x - x1) );
    while (accum_dist < xsec.xsec[i].dist) {
      var x2 = x1 + Math.cos(theta)*accum_dist;
      var y2 = y1 + Math.sin(theta)*accum_dist;
      flooded_xsec.push({x:x2,y:y2});
      accum_dist += short_dist;
      accum_total_dist += short_dist;
    }
    flooded_xsec.pop();  //Remove last point because it went too far
    var partial_dist = $scope.dist({x:x2,y:y2}, {x:xsec.xsec[i].x,y:xsec.xsec[i].y});
    //var remain_dist = xsec.xsec[i].dist - partial_dist;
    accum_dist = partial_dist;
    ii = i;
  }
  flooded_xsec.push(xsec.xsec[ii]);
  return flooded_xsec;
}

$scope.plot_bulkheads = function(location_xy) {
  // Not much to do here except set the offsets and turn the bulkheads on.  partial1.html does the true plotting
  var spacingx = 15;
  // location_xy={x:0,y:0};  // debug
  // $scope.sst2.bulkhead_placement_xy = location_xy;
  $scope.sst2.show_bulkheads = true;
  var run_pointx = 0;
  for (var i=0;i<$scope.sst.bulkheads.length;i++) {
    var b = $scope.sst.bulkheads[i];
    b.extents = $scope.get_extents(b.shape);
    b.display_offset = {x:(location_xy.x + run_pointx), y:location_xy.y};
    run_pointx += (b.extents.max_point.x - b.extents.min_point.x) + spacingx;
  }
  $scope.sst.show_final_bulkheads = true;
}

$scope.generate_bulkheads = function() {
  // for each bulkhead
  var i;
  var j;

  var top_tmxs = $scope.get_tmx_horizontal($scope.sst.top.reference_line.nose, $scope.sst.top.reference_line.tail);
  var side_tmxs = $scope.get_tmx_horizontal($scope.sst.side.reference_line.nose, $scope.sst.side.reference_line.tail);
  var ortho_side_top_outline = $scope.transform_array($scope.sst.side.top_outline, side_tmxs.tmx);
  var ortho_side_bottom_outline = $scope.transform_array($scope.sst.side.bottom_outline, side_tmxs.tmx);
  var ortho_top_left_outline = $scope.transform_array($scope.sst.top.left_outline, top_tmxs.tmx);
  //$scope.sst.bulkheads.shift(); //Don't know where this unwanted bulkhead is coming from.  Bug from somewhere but for now just get rid of it.

  for (i=0;i<$scope.sst.bulkheads.length;i++) {
    var bulkhead  = $scope.sst.bulkheads[i];
    var mode = $scope.sst2.generation_mode;
    if (bulkhead.generation_mode === 'normal') {
      var nearest_lesser = {index: -1, dist:9999999999};
      var nearest_greater = {index: -1, dist:9999999999};
      for (j=0;j<$scope.sst.xsecs.length;j++) {
        var xsec = $scope.sst.xsecs[j];
        if (xsec.station[0].x > bulkhead.x) {
          var greater_dist = xsec.station[0].x - bulkhead.x;
          if (nearest_greater.dist > greater_dist) {
            nearest_greater.dist = greater_dist;
            nearest_greater.index = j
          }
        } else {
          var lesser_dist = bulkhead.x - xsec.station[0].x;
          if (nearest_lesser.dist > lesser_dist) {
            nearest_lesser.dist = lesser_dist;
            nearest_lesser.index = j
          }
        }
        // Determine if we have generated flood points for the cross section yet and add if needed
        if (!xsec.flood_points) {
          xsec.flood_points = $scope.add_flood_points_newest(xsec, 200);
        }
      }
    } else {
      // extrapolate 'extrapolate tail side' or 'extrapolate nose side'
      var direction = 1;
      if (bulkhead.generation_mode === 'extrapolate nose side') {
        direction = -1;
      }
      var nearest_1 = {index: -1, dist:9999999999};
      var nearest_2 = {index: -1, dist:9999999999};
      var dist2 = 9999999999;
      var index2 = -1;
      for (j=0;j<$scope.sst.xsecs.length;j++) {
        var xsec = $scope.sst.xsecs[j];
        if ( (xsec.station[0].x * direction) > (bulkhead.x * direction) ) {
          var dist = Math.abs(xsec.station[0].x - bulkhead.x);
          if (dist < nearest_1.dist) {
            var dist2 = nearest_1.dist;
            var index2 = nearest_1.index;
            nearest_1.dist = dist;
            nearest_1.index = j;
          }
          if (dist < nearest_2.dist && dist > nearest_1.dist) {
            nearest_2.dist = dist;
            nearest_2.index = j;
          } else if (dist2 < nearest_2.dist) {
            nearest_2.dist = dist2;
            nearest_2.index = index2;
          }
        }
        // Determine if we have generated flood points for the cross section yet and add if needed
        if (!xsec.flood_points) {
          xsec.flood_points = $scope.add_flood_points_newest(xsec, 200);
        }
      }
      // arbitrarily assign nearest_lesser and nearest greater
      nearest_lesser = nearest_1;
      nearest_greater = nearest_2;
    }
    // we have the bulkhead location and the two nearest xsecs
    var lesser = $scope.sst.xsecs[nearest_lesser.index];
    var greater = $scope.sst.xsecs[nearest_greater.index];
    var new_bulkhead = [];
    var end = lesser.flood_points.length > greater.flood_points.length ? greater.flood_points.length : lesser.flood_points.length;
    for (j=0;j<end;j++) {
      // For 3d, we just do this twice from two points of view.
      var jlesser = j; var jgreater = j;
      if (j === end - 1) {
        jlesser = lesser.flood_points.length - 1;
        jgreater = greater.flood_points.length -1;
      }
      var pvx = $scope.linear_interpolation({x:lesser.station[0].x,y:lesser.flood_points[jlesser].x},
                                            {x:greater.station[0].x,y:greater.flood_points[jgreater].x},
                                            bulkhead.x);
      var pvy = $scope.linear_interpolation({x:lesser.station[0].x,y:lesser.flood_points[jlesser].y},
                                            {x:greater.station[0].x,y:greater.flood_points[jgreater].y},
                                            bulkhead.x);
      new_bulkhead.push({x:pvx,y:pvy});
    }
    // Determine it's current width/height
    bulkhead.extents = $scope.get_extents(new_bulkhead);

    var result = $scope.is_point_in_top_or_side(bulkhead);
    if (result.location === 'none' || result.location === 'all') {
      alert("Bulkhead location is not in top/bottom nor side view zones");
      return;
    }
    // args {tmxs: top_tmxs, recvr: top_disp_recvr}
    if (result.location === "top") {
      var ortho_point = $scope.transform(bulkhead, top_tmxs.tmx);  // make sure passing bulkhead as a point is ok
    } else if (result.location === "side") {
      var ortho_point = $scope.transform(bulkhead, side_tmxs.tmx); // make sure passing bulkhead as a point is ok
    }

    // Need to scale bulkhead x and y to fit side and top outlines.
    var b4_width = bulkhead.extents.max_point.x - bulkhead.extents.min_point.x;
    var x_top_ref = $scope.transform($scope.sst.top.reference_line.nose, top_tmxs.tmx);
    var width_y = $scope.outline_as_function(ortho_point.x, ortho_top_left_outline).y
    var desired_width = Math.abs(width_y - x_top_ref.x);
    var x_scale = desired_width / b4_width;

    var b4_height = bulkhead.extents.max_point.y - bulkhead.extents.min_point.y;
    var y_side_1 = $scope.outline_as_function(ortho_point.x, ortho_side_top_outline);
    var y_side_2 = $scope.outline_as_function(ortho_point.x, ortho_side_bottom_outline);
    var desired_height = Math.abs(y_side_1.y - y_side_2.y);
    var y_scale = desired_height / b4_height;

    var trans_x = -bulkhead.extents.min_point.x;
    var trans_y = -bulkhead.extents.min_point.y;

    var tmx1 = [
                 [1, 0, trans_x],
                 [0, 1, trans_y],
                 [9, 0, 1      ]
               ];

    var tmx2 = [
                 [x_scale, 0,       0],
                 [0,       y_scale, 0],
                 [9,       0,       1]
               ];

    //var tmx_1_2 = math.dotMultiply(tmx1, tmx2);
    var newer_bulkhead = [];
    for (j=0;j<new_bulkhead.length;j++) {
      new_bulkhead[j].x += trans_x;
      new_bulkhead[j].y += trans_y;
      new_bulkhead[j].x *= x_scale;
      new_bulkhead[j].y *= y_scale;
      //var scaled = math.multiply(tmx_1_2, [[new_bulkhead[j].x],[new_bulkhead[j].y],[1]] );
      //scaled = math.multiply(tmx2, [[scaled[0][0]],[scaled[1][0]],[1]] );
      //var p = {x:scaled[0][0], y:scaled[1][0]};
      newer_bulkhead.push(new_bulkhead[j]);
    }

    bulkhead.shape = newer_bulkhead;
  }

  // Ask where the bulkheads will go

  $scope.sst2.bulkhead_plot_location = {x:220,y:110};
  //$scope.set_point($scope.sst2.bulkhead_plot_location, false, 'Click where you want the bulkheads to be placed (they fill in horizontally to the right)');
  $scope.op_seq.push({
    handler: $scope.plot_bulkheads,
    dest: $scope.sst2.bulkhead_plot_location,
    is_loop: false,
    dont_want_coord: true,
    instruction: 'Pretty bulkheads!'
  });
  $scope.get_coord_interval = setInterval($scope.proc_op_seq, 500);
  $scope.get_coord_live = true;
};

$scope.clear_op = function() {
  $scope.sst.show_final_bulkheads = false;
  $scope.sst2.show_bulkheads = false;
  $scope.set_display('select-background', false);
  $scope.set_display('select-fuselage', false);
  $scope.sst2.generation_mode = 'normal';
  $scope.set_display('bulkhead-controls', false);
  $scope.set_display("show-button", false);
  $scope.op_seq = [];
};

$scope.safe_apply = function() {
  if ($scope.$root.$$phase != '$apply' && $scope.$root.$$phase != '$digest') {
    $scope.$apply();
  }
};

$scope.done_button = function() {
  if ($scope.is_ghost_echo_bug()) {return;}
  $scope.get_coord_live = false;
  $scope.set_display('bulkhead-controls', false);
  $scope.set_display("show-button", false);
  $scope.undoable = undefined;
  $scope.op_seq = [];
  if ($scope.need_xsec_transform) {
    $scope.need_xsec_transform = false;
    $scope.transform_xsec_points();
  }
};

$scope.undo_point = function() {
  if ($scope.is_ghost_echo_bug()) {return;}
  if ($scope.undoable) {
    var throw_away = $scope.undoable.pop();
  }
};

$scope.set_plan_image = function(image_file, is_on) {
  $scope.sst.plan_image = image_file;
  $scope.show_background = is_on;
};

$scope.proc_op_seq = function() {

  $scope.instruction = "";
  if (!$scope.get_coord_live) {
    clearInterval($scope.get_coord_interval);
    $scope.safe_apply();
    return;
  }
  if ($scope.op_seq.length === 0) {
    if ($scope.get_coord_live) {
      clearInterval($scope.get_coord_interval);
      $scope.get_coord_live = false;
    }
    $scope.safe_apply();
    return;
  }
  $scope.instruction = $scope.op_seq[0].instruction;
  if($scope.coord_available || $scope.op_seq[0].dont_want_coord) {
    $scope.op_seq[0].handler($scope.op_seq[0].dest,$scope.op_seq[0].index);
    if ($scope.op_seq[0].handler2) {
      $scope.op_seq[0].handler2($scope.op_seq[0].args2);
    }
    if ($scope.op_seq[0].handler3) {
      $scope.op_seq[0].handler3($scope.op_seq[0].args3);  // Not used yet?
    }
    if (!$scope.op_seq[0].is_loop) {
      $scope.op_seq.shift();
    }
    $scope.coord_available = false;
  }
  $scope.safe_apply();
};

$scope.set_point = function(element, ok_to_go, instruct) {
  $scope.is_dirty = true;
  element.x = null; element.y = null;
  $scope.coord_available = false;
  $scope.op_seq = [];
  $scope.op_seq.push({
    handler: $scope.set_xy_click,
    dest: element,
    is_loop: false,
    instruction: instruct
  });
  if (ok_to_go) {
    $scope.get_coord_interval = setInterval($scope.proc_op_seq, 500);
    $scope.get_coord_live = true;
  }
};

$scope.set_box = function(element) {
  if ($scope.is_ghost_echo_bug()) {return;}
  $scope.is_dirty = true;
  element.lower_left.x = null; element.lower_left.y = null;
  element.upper_right.x = null;element.upper_right.y = null;
  $scope.coord_available = false;
  $scope.op_seq = [];
  $scope.op_seq.push({
    handler: $scope.set_xy_click,
    dest: element.lower_left,
    is_loop: false,
    instruction: element.lower_left.instruct
  });
  $scope.op_seq.push({
    handler: $scope.set_xy_click,
    dest: element.upper_right,
    is_loop: false,
    instruction: element.upper_right.instruct
  });
  $scope.get_coord_interval = setInterval($scope.proc_op_seq, 500);
  $scope.get_coord_live = true;
};

$scope.set_line = function(element) {
  if ($scope.is_ghost_echo_bug()) {return;}
  $scope.is_dirty = true;
  element.nose.x = null; element.nose.y = null;
  element.tail.x = null; element.tail.y = null;
  $scope.coord_available = false;
  $scope.op_seq = [];
  $scope.op_seq.push({
    handler: $scope.set_xy_click,
    dest: element.nose,
    is_loop: false,
    instruction: element.nose.instruct
  });
  $scope.op_seq.push({
    handler: $scope.set_xy_click,
    dest: element.tail,
    is_loop: false,
    instruction: element.tail.instruct
  });
  $scope.get_coord_interval = setInterval($scope.proc_op_seq, 500);
  $scope.get_coord_live = true;
};

$scope.set_arc = function(element, clean) {
  // if ($scope.is_ghost_echo_bug()) {return;}
  $scope.undoable = element;
  $scope.set_display('bulkhead-controls', false);
  $scope.set_display('show-button', true);
  $scope.is_dirty = true;
  for (var i=element.length;i>=0;i--) {
    element.pop();
  }
  $scope.coord_available = false; // turn off any existing point gathering
  if (clean) {
    $scope.op_seq = [];
  }
  $scope.op_seq.push({
    handler:$scope.set_xy_arc_click,
    dest: element,
    is_loop: true,
    instruction: 'Click to add new point. Click done button when done.'
  });
  $scope.get_coord_interval = setInterval($scope.proc_op_seq, 500);
  $scope.get_coord_live = true;
};

$scope.is_point_in_top_or_side = function(point) {
  var in_top_zone = false;
  var in_side_zone = false;
  if (!$scope.sst.side.zone) {
    return {location:"none", message:"Need to digitize side view zone first."};
  }
  if (!$scope.sst.top.zone) {
    return {location:"none", message:"Need to digitize top/bottom view zone first."};
  }
  if (point.x >= $scope.sst.side.zone.lower_left.x &&
      point.x <= $scope.sst.side.zone.upper_right.x &&
      point.y >= $scope.sst.side.zone.upper_right.y &&
      point.y <= $scope.sst.side.zone.lower_left.y) {
    in_side_zone = true;
  }
  if (point.x >= $scope.sst.top.zone.lower_left.x &&
      point.x <= $scope.sst.top.zone.upper_right.x &&
      point.y >= $scope.sst.top.zone.upper_right.y &&
      point.y <= $scope.sst.top.zone.lower_left.y) {
    in_top_zone = true;
  }
  if (in_side_zone && in_top_zone) {
    return {location:"all", message:"Side view and top/bottom view zones overlap.  can't determine whether point is in side or top/bottom view zones."}
  }
  if (!in_side_zone && !in_top_zone) {
    return {location:"none", message:"Point was not digitized in either the side view or top/bottom view zones."}
  }
  if (in_side_zone) {
    return {location:"side", message:""}
  }
  if (in_top_zone) {
    return {location:"top", message:""}
  }
};

$scope.linear_interpolation = function(p1, p2, x) {  // Also does extrapolation
  if (p1.x === p2.x) {         // This is an input error but we provide a fault-tolerant result
    return (p1.y + p2.y) / 2;  // if the x's coincide just return the average of the y's
  }
  var rise = p2.y - p1.y;
  var run = p2.x - p1.x;
  var slope = rise/run;
  var y = ((x - p1.x) * slope) + p1.y
  return y;
};

$scope.outline_as_function = function(x, ortho_outline) {
  for (var i=1;i<ortho_outline.length;i++) {
    if (i===0 && x < ortho_outline[0].x) {
      return {y:999999, message:'Point location is outside the outline range (beyond nose)'};
    }
    if (x > ortho_outline[i-1].x && x < ortho_outline[i].x) {
      var y = $scope.linear_interpolation( ortho_outline[i-1], ortho_outline[i], x);
      return {y:y, message:''};
    }
  }
  return {y:999999, message:'Point location is outside the outline range (beyond tail)'};
};

$scope.check_prereq_xsec_bulkhead = function(type) {
  if (type === 'bulkhead') {
    if ($scope.sst.xsec.is_dirty) {
      alert("Need to run 'Cleanup Cross Sections' first.");
      return false;
    } else if ($scope.sst.xsecs.length < 2) {
      alert("Need at least 2 cross sections before any work with bulkheads can be done");
      return false;
    }
  } else if (type === 'xsec') {

  }
  if ($scope.sst.top.left_outline.length === 0 || $scope.sst.side.bottom_outline.length === 0 || $scope.sst.side.top_outline.length === 0) {
    alert("Need to define both the side-view outline and the top-view outline");
    return false;
  }
  return true;
};

$scope.make_display_point = function(args) {
  var point = {x:$scope.theX, y:$scope.theY};
  var result = $scope.is_point_in_top_or_side(point);
  if (result.location === 'none' || result.location === 'all') {
    alert(result.message);
    return;
  }
  // args {tmxs: top_tmxs, recvr: top_disp_recvr}
  if (result.location === "top") {
    var ortho_point = $scope.transform(point, args.top_tmxs.tmx);
  } else if (result.location === "side") {
    var ortho_point = $scope.transform(point, args.side_tmxs.tmx);
  }
  var ortho_top_left_outline = $scope.transform_array($scope.sst.top.left_outline, args.top_tmxs.tmx);
  var ortho_side_bottom_outline = $scope.transform_array($scope.sst.side.bottom_outline, args.side_tmxs.tmx);
  var ortho_side_top_outline = $scope.transform_array($scope.sst.side.top_outline, args.side_tmxs.tmx);
  var ortho_top_center_line = $scope.transform($scope.sst.top.reference_line.nose, args.top_tmxs.tmx);
  var ortho_center_point = {x:ortho_point.x, y:ortho_top_center_line.y};
  var res_outline = $scope.outline_as_function(ortho_point.x, ortho_top_left_outline);
  var res_top_outline = $scope.outline_as_function(ortho_point.x, ortho_side_top_outline);
  var res_bottom_outline = $scope.outline_as_function(ortho_point.x, ortho_side_bottom_outline);
  if (res_outline.message !== "") {
    alert(res_outline.message);
    return;
  }
  // top view
  var ortho_edge_point = {x:ortho_point.x , y:res_outline.y};
  var edge_point = $scope.transform(ortho_edge_point, args.top_tmxs.inv_tmx);
  var center_point = $scope.transform(ortho_center_point, args.top_tmxs.inv_tmx);
  args.top_recvr.push({x1:center_point.x, y1:center_point.y, x2:edge_point.x, y2:edge_point.y});
  // side view
  var ortho_top_edge_point = {x:ortho_point.x , y:res_top_outline.y};
  var top_edge_point =   $scope.transform(ortho_top_edge_point, args.side_tmxs.inv_tmx);
  var ortho_bottom_edge_point = {x:ortho_point.x , y:res_bottom_outline.y};
  var bottom_edge_point =   $scope.transform(ortho_bottom_edge_point, args.side_tmxs.inv_tmx);
  args.side_recvr.push({x1:top_edge_point.x, y1:top_edge_point.y, x2:bottom_edge_point.x, y2:bottom_edge_point.y});
};

// This is used for both Cross Sections and Bulkheads
$scope.set_arc_stations = function(recvr, top_disp_recvr, side_disp_recvr, top_tmxs, side_tmxs, is_many, is_bulkhead) {
  $scope.undoable = recvr;
  $scope.set_display('bulkhead-controls', is_bulkhead);
  $scope.set_display('show-button', true);
  $scope.is_dirty = true;
  $scope.coord_available = false; // turn off any existing point gathering

  var args2 = {top_tmxs: top_tmxs, top_recvr: top_disp_recvr, side_tmxs: side_tmxs, side_recvr: side_disp_recvr, is_bulkhead: is_bulkhead};
  var the_instruction = 'Click to add new point.';
  if (is_many) {
    the_instruction += '  Click done button when done.'
  }
  if (is_bulkhead) {
    $scope.op_seq.push({
      handler:$scope.set_xy_arc_click,
      handler2:$scope.make_display_point,
      handler3:$scope.set_generation_mode,
      args2: args2,
      dest: recvr,
      is_loop: is_many,
      instruction: the_instruction
    });
  } else {
    $scope.op_seq.push({
      handler:$scope.set_xy_arc_click,
      handler2:$scope.make_display_point,
      args2: args2,
      dest: recvr,
      is_loop: is_many,
      instruction: the_instruction
    });
  }
};

$scope.transform_xsec_points = function() {
  var x_index = $scope.sst.xsecs.length-1;
  var the_xsec = $scope.sst.xsecs[x_index];
  var is_in_top = $scope.is_point_in_view_zone('top', the_xsec.station[0]);
  var is_in_side = $scope.is_point_in_view_zone('side', the_xsec.station[0]);
  if (!is_in_top && !is_in_side) {
    alert('Your locating fore/aft coordinate for your xsec is in neither the top/bottom nor side view zones.');
  }
  var top_ref = $scope.sst.top.reference_line;
  var top_tmxs = $scope.get_tmx_horizontal(top_ref.nose, top_ref.tail);
  var side_ref = $scope.sst.side.reference_line;
  var side_tmxs = $scope.get_tmx_horizontal(side_ref.nose, side_ref.tail);
  var tmxs;
  if (is_in_top) {
    tmxs = top_tmxs;
  } else {
    tmxs = side_tmxs;
  }
  the_xsec.ortho_station = $scope.transform(the_xsec.station[0], tmxs.tmx);
  //Now transform the arc coordinates so the center is at 0,0
  var center_y;
  var ortho_top_point = $scope.transform(the_xsec.xsec[0], side_tmxs.tmx);
  var ortho_nose_point = $scope.transform(top_ref.nose, side_tmxs.tmx);
  center_y = ortho_top_point.y - ortho_nose_point.y;
  var arc_tmxs = $scope.get_tmx_xsec(the_xsec.xsec[0], the_xsec.xsec[the_xsec.xsec.length-1], center_y);
  the_xsec.ortho_shape = [];
  for (var i=0;i<the_xsec.xsec.length;i++) {
    the_xsec.ortho_shape.push($scope.transform(the_xsec.xsec[i],side_tmxs.tmx));
  }
};
$scope.set_generation_mode = function() {
  $scope.sst.bulkheads[$scope.sst.bulkheads.length-1].generation_mode = $scope.sst2.generation_mode;
};
$scope.set_bulkhead_arc = function(recvr, top_ref, side_ref) {
  if (!$scope.check_prereq_xsec_bulkhead('bulkhead')) { return; }
  var top_tmxs = $scope.get_tmx_horizontal(top_ref.reference_line.nose, top_ref.reference_line.tail);
  var side_tmxs = $scope.get_tmx_horizontal(side_ref.reference_line.nose, side_ref.reference_line.tail);
  $scope.set_arc_stations(recvr, top_ref.display.bulk, side_ref.display.bulk, top_tmxs, side_tmxs, true, true);
  $scope.get_coord_interval = setInterval($scope.proc_op_seq, 500);
  $scope.get_coord_live = true;
};

$scope.set_xsec_point_and_arc = function(xsec_recvr, top_ref, side_ref) {
  if ($scope.is_ghost_echo_bug()) {return;}
  if (!$scope.check_prereq_xsec_bulkhead('xsec')) { return; }
  var top_tmxs = $scope.get_tmx_horizontal(top_ref.reference_line.nose, top_ref.reference_line.tail);
  var side_tmxs = $scope.get_tmx_horizontal(side_ref.reference_line.nose, side_ref.reference_line.tail);
  var xsec_id = xsec_recvr.push({station:[],xsec:[]});
  var xsec_index = xsec_id - 1;

  $scope.is_dirty = true;
  $scope.op_seq = [];

  $scope.set_arc_stations(xsec_recvr[xsec_index].station, $scope.sst.top.display.xsec, $scope.sst.side.display.xsec, top_tmxs, side_tmxs, false, false);
  $scope.set_arc(xsec_recvr[xsec_index].xsec, false);
  $scope.need_xsec_transform = true;
  $scope.get_coord_interval = setInterval($scope.proc_op_seq, 500);
  $scope.get_coord_live = true;
};

$scope.save_data = function() {
  localStorage.setItem('fuselage', JSON.stringify($scope.sst) );
};
$scope.restore_data = function() {
  var do_it = true;
  if ($scope.is_dirty) {
    if (!window.confirm("You have made changes.  Are you sure you want to restore on top of your changes?")) {
      do_it = false;
    }
  }
  if (do_it) {
    $scope.sst = JSON.parse(localStorage.getItem('fuselage') );
    $scope.show_background = true;
    $scope.safe_apply();
  }
};
$scope.make_svg = function() {
  $scope.sst2.svg = $window.document.getElementById('svg-bulkheads').outerHTML;
};
$scope.make_fuselage = function() {
  $scope.fuselage_serialized = JSON.stringify($scope.sst);
};
$scope.download_file = function(content, file_name, mime_type) {
  var a = document.createElement('a');
  mime_type = mime_type || 'application/octet-stream';

  if (navigator.msSaveBlob) { // IE10
    return navigator.msSaveBlob(new Blob([content], { type: mime_type }),     fileName);
  } else if ('download' in a) { //html5 A[download]
    a.href = 'data:' + mime_type + ',' + encodeURIComponent(content);
    a.setAttribute('download', file_name);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } else { //do iframe dataURL download (old ch+FF):
    var f = document.createElement('iframe');
    document.body.appendChild(f);
    f.src = 'data:' + mime_type + ',' + encodeURIComponent(content);

    setTimeout(function() {
      document.body.removeChild(f);
    }, 333);
    return true;
  }
};
$scope.select_xsec = function(ix) {
  $scope.sst2.selected_xsec = ix;
};
$scope.select_bulkhead = function(ix) {
  $scope.sst2.selected_bulkhead = ix;
};
$scope.destroy_any = function(mode, type1, type2, sing_noun, plural_noun, selected_index) {
  if ($scope.is_ghost_echo_bug()) {return;}
  if (mode === 'all') {
    if ($scope.sst[type1].length == 1) {
      if (window.confirm('Are you sure you want to delete the '+sing_noun+'?')) {
        $scope.sst[type1] = [];
        $scope.sst.top.display[type2] = [];
        $scope.sst.side.display[type2] = [];
        $scope.is_dirty = true;
      }
    } else if ($scope.sst[type1].length > 1) {
      if (window.confirm('Are you sure you want to delete all ' + $scope.sst[type1].length + ' '+plural_noun+'?')) {
        $scope.sst[type1] = [];
        $scope.sst.top.display[type2] = [];
        $scope.sst.side.display[type2] = [];
        $scope.is_dirty = true;
      }
    }
  } else {
    if (selected_index === -2) {
      selected_index = -1
      return;
    }
    if (!selected_index || selected_index === -1) {
      alert ('Need to select a '+sing_noun+' first');
    } else {
      if (window.confirm('Are you sure you want to delete the selected '+sing_noun+'?')) {
        $scope.sst[type1].splice(selected_index,1);
        $scope.sst.top.display[type2].splice(selected_index,1);
        $scope.sst.side.display[type2].splice(selected_index,1);
        selected_index = -2;
        $scope.is_dirty = true;
      }
    }
  }
};
$scope.destroy = function(obj, sing_noun, plural_noun) {
  if (obj.length == 1) {
    if (window.confirm('Are you sure you want to delete the ' + sing_noun)) {
      obj = [];
    }
  } else if (obj.length > 1) {
    if (window.confirm('Are you sure you want to delete all ' + obj.length + ' ' + plural_noun + '?')) {
      obj = [];
    }
  } else {
    alert('Nothing to delete')
  }
};
$scope.is_empty = function(obj) {
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop))
            return false;
    }
    return true && JSON.stringify(obj) === JSON.stringify({});
};

$scope.get_tmx_xsec = function(point_a, point_b, center_y) {
  var angle = Math.atan2(point_b.y - point_a.y, point_b.x - point_a.x);
  var theta = -angle;
  var costh = Math.cos(theta);
  var sinth = Math.sin(theta);
  var tmx = [];
  var h = -point_a.x;
  var k = -(point_a.y + center_y);
  tmx[0] = [costh, -sinth, h*costh - k*sinth];
  tmx[1] = [sinth, costh,  h*sinth + k*costh];
  tmx[2] = [0,     0,      1];

  var inv_tmx = [];
  inv_tmx[0] = [costh,  sinth, -h];
  inv_tmx[1] = [-sinth, costh, -k];
  inv_tmx[2] = [0,      0,     1];
  return {tmx: tmx, inv_tmx: inv_tmx};
}

$scope.get_tmx_horizontal = function(point_a, point_b) {
  var angle = Math.atan2(point_b.y - point_a.y, point_b.x - point_a.x);
  var theta = -angle;
  var costh = Math.cos(theta);
  var sinth = Math.sin(theta);
  var tmx = [];
  var h = -point_a.x;
  var k = -point_a.y;
  tmx[0] = [costh, -sinth, h*costh - k*sinth];
  tmx[1] = [sinth, costh,  h*sinth + k*costh];
  tmx[2] = [0,     0,      1];

  var inv_tmx = [];
  inv_tmx[0] = [costh,  sinth, -h];
  inv_tmx[1] = [-sinth, costh, -k];
  inv_tmx[2] = [0,      0,     1];
  return {tmx: tmx, inv_tmx: inv_tmx};
};

$scope.model_integrity_check = function() {
  var i;
  var j;
  var reverses = 0;
  var mirrors = 0;
  // xsecs formed properly
  $scope.clean_up_xsecs();
  for (var i=0; i < $scope.sst.xsecs.length; i++) {
    var xsec = $scope.sst.xsecs[i];
    var last = xsec.xsec.length - 1;
    // Check for reversal of xsec coords
    if (xsec.xsec[0].y > xsec.xsec[last].y) {
      xsec.xsec.reverse();
      reverses++;
    }
    // check for bacwards (left/right) xsec
    var mid = Math.ceil(last/2);
    if (xsec.xsec[mid].x < xsec.xsec[0].x) {
      var flipx = [
        [-1, 0, 0],
        [0, 1, 0],
        [0, 0, 1]
      ];
      var reX = xsec.xsec[0].x;
      for (j=0;j<xsec.xsec.length;j++) {
        var pt = [[xsec.xsec[j].x], [xsec.xsec[j].y], [1]]
        var pt2 = math.multiply(flipx, pt);
        xsec.xsec[j].x = pt2[0][0] + (reX*2);
        xsec.xsec[j].y = pt2[1][0];
      }
      xsec.flood_points = undefined;
      mirrors++;
    }
  }
  alert (reverses + " cross sections needed to be inverted.\n" + mirrors + " cross sections needed to be mirrored.\n")
};

$scope.is_ghost_echo_bug = function() {
  $scope.sst2.call_nbr++;
  if ( ($scope.sst2.call_nbr % 2) === 0 ) {
    return false;
  } else {
    return true;
  }
}

$scope.transform = function(pt, tmx) {
  var pt_matrix = [[pt.x],[pt.y],[1]];
  var result_matrix = math.multiply(tmx, pt_matrix);
  return {x:result_matrix[0][0], y:result_matrix[1][0]};
}

$scope.transform_array = function(pts, tmx) {
  var new_pts = [];
  for (var i=0;i<pts.length;i++) {
    new_pts.push($scope.transform(pts[i], tmx));
  }
  return new_pts;
}

$scope.orthofix_ref_line = function(obj, obj2) {
  var tmx = ( $scope.get_tmx_horizontal(obj.reference_line.nose, obj.reference_line.tail) ).tmx;  // ignore inv_tmx
  var rot_point_nose = [[obj.reference_line.nose.x],[obj.reference_line.nose.y],[1]];
  var rot_point_tail = [[obj.reference_line.tail.x],[obj.reference_line.tail.y],[1]];
  var rotatd_nose = math.multiply(tmx, rot_point_nose);
  var rotatd_tail = math.multiply(tmx, rot_point_tail);
  obj2 = {
           tmx: tmx,
           reference_line: {
             nose: {
               x: rotatd_nose[0][0],
               y: rotatd_nose[1][0]
             },
             tail: {
               x: rotatd_nose[0][0],
               y: rotatd_nose[1][0]
             }
           }
        };
  return obj2;
};

$scope.is_point_in_view_zone = function(view, point) {
  var zone;
  if (view === 'side') {
    zone = $scope.sst.side.zone;
  } else if (view === 'top') {
    zone = $scope.sst.top.zone;
  }
  if (  // Make sure station point is in one of the side or top zone boxes
     (point.x >= zone.lower_left.x &&
      point.x <= zone.upper_right.x &&
      point.y >= zone.upper_right.y &&
      point.y <= zone.lower_left.y)) {
    return true;
  }
  return false;
}

$scope.clean_up_xsecs = function() {
  $scope.sst.xsec.is_dirty = false;
  $scope.is_dirty = true;
  var i;
  if ($scope.sst.xsecs.length === 0) {
    alert("You don't have any cross sections defined.");
    return;
  }
  for (i=$scope.sst.xsecs.length-1;i>=0;i--) {
    if ($scope.is_empty($scope.sst.xsecs[i].station) || $scope.sst.xsecs[i].xsec.length === 0) {
      $scope.sst.xsecs.splice(i,1);
      i--;
    }
    if ($scope.sst.xsecs[i].xsec.length === 0) {
      $scope.sst.xsecs.splice(i,1);  // Eliminate empty cross section
      i--;
    }
  }
  if (!$scope.sst.side.zone.length === 2) {
    alert("You don't have a side zone box defined (or it's improperly formed). Fix this and run this clean up again and it will be more thorough.");
    return;
  }
  if (!$scope.sst.top.zone.length === 2) {
    alert("You don't have a top zone box defined (or it's improperly formed). Fix this and run this clean up again and it will be more thorough.");
    return;
  }
  for (i=$scope.sst.xsecs.length-1;i>=0;i--) {
    var is_in_top = $scope.is_point_in_view_zone('top', $scope.sst.xsecs[i].station[0]);
    var is_in_side = $scope.is_point_in_view_zone('side', $scope.sst.xsecs[i].station[0]);
    // Make sure station point is in one of the side or top zone boxes
    if (is_in_top || is_in_side) {
         // It's good!
       } else {
         $scope.sst.xsecs.splice(i,1);
       }
    }
};

$scope.window_width = function(){
   return window.innerWidth||document.documentElement.clientWidth||document.body.clientWidth||0;
};
$scope.window_height = function(){
   return window.innerHeight||document.documentElement.clientHeight||document.body.clientHeight||0;
};

$scope.locate_toolbox = function()  {
  var left = $scope.window_width() - $scope.tool_box_width + "px";
  var top = 0 + "px";
  $scope.tool_box.style.left = left;
  $scope.tool_box.style.top = top;

};

$scope.click_on_image = function(event) {
  // Firefox needs to use getBoundingClientRect().left instead of offsetLeft and offsetTop
  // That is the source of the bugs.  Need to revert to offsetLeft and offsetTop and figure something
  // else for Firefox
  var the_svg = document.getElementById('the-svg-div');
  var xOffset=Math.max(document.documentElement.scrollLeft,document.body.scrollLeft)-8
    - the_svg.offsetLeft;
  var yOffset=Math.max(document.documentElement.scrollTop,document.body.scrollTop)-8
    - the_svg.offsetTop;
  $scope.theX = event.clientX + xOffset;
  $scope.theY = event.clientY + yOffset;
  $scope.coord_available = true;
};

$scope.set_display = function(the_id, is_showable) {
  var display;
  if (is_showable) {
    display = 'block';
  } else {
    display = 'none';
  }
  if ($window.document.getElementById(the_id) !== null) {
    $window.document.getElementById(the_id).style.display = display;
  } else {
    $rootScope.window.document.getElementById(the_id).style.display = display;
  }
};

$scope.initialize_toolbox = function() {
  $scope.set_display('bulkhead-controls', false);
  $scope.set_display('show-button', $scope.show_button)
};

$scope.sst2.bulkhead_placement_xy = {x:-200,y:-50};
$scope.is_dirty = false;
$scope.show_button = false;
$scope.sst2.call_nbr = 0;
$scope.m = {};
$scope.show_background = true;
$scope.set_plan_image("img/p51_side.jpg");
$scope.non_modal_shown = true;
$scope.tool_box = document.getElementById('the-toolbox');
$scope.tool_box_width = 300;
$scope.tool_box_height = 500;
$scope.sst.show_final_bulkheads = false;
$scope.set_display('select-background', false);
$scope.set_display('select-fuselage', false);
$scope.sst.background_3view = "";
$scope.sst2.generation_mode = 'normal';
}])
.controller('MyCtrl2', [function() {

}]);
