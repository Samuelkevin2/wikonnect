const Router = require('koa-router');
const User = require('../models/user');
const Enrollments = require('../models/enrollment');
const { requireAuth } = require('../middleware/permController');

const router = new Router({
  prefix: '/enrollments'
});


async function enrolledCoursesType(parent) {
  try {
    if (parent.length == undefined) {
      parent.enrolledCourses.forEach(lesson => {
        return lesson.type = 'course';
      });
    } else {
      parent.forEach(mod => {
        mod.enrolledCourses.forEach(lesson => {
          return lesson.type = 'course';
        });
      });
    }
  } catch (error) {
    console.log(error);
  }
}


router.post('/', requireAuth, async ctx => {
  /**
   * enroll = {
   *    course_id => string,
   *    user_id => string
   * }
   */
  let enrollments;
  try {
    enrollments = await Enrollments.query().insertAndFetch({ 'course_id': ctx.query.course_id, 'user_id': ctx.state.user.data.id});
  } catch (e) {
    if (e.statusCode) {
      ctx.throw(e.statusCode, null, { errors: [e.message] });
    } else { ctx.throw(400, null, { errors: [e.message] }); }
    throw e;
  }
  ctx.assert(enrollments, 401, 'Something went wrong');
  ctx.status = 200;
  ctx.body = { enrollments };
});

router.get('/', requireAuth, async ctx => {
  let enrollment;
  try {
    enrollment = await Enrollments.query().where({ 'user_id': ctx.state.user.data.id });
  } catch (e) {
    if (e.statusCode) {
      ctx.throw(e.statusCode, null, {errors: [e.message]});
    } else { ctx.throw(400, null, { errors: ['Bad request']});}
    throw e;
  }

  ctx.status = 200;
  ctx.body = { enrollment };
});

router.get('/user', requireAuth, async ctx => {
  let user;
  try {
    user = await User.query().where(ctx.query).eager('enrolledCourses(selectNameAndId)');
    enrolledCoursesType(user);
    ctx.status = 200;
  } catch (e) {
    if (e.statusCode) {
      ctx.throw(e.statusCode, null, { errors: [e.message] });
    } else { ctx.throw(400, null, { errors: ['Bad request'] }); }
    throw e;
  }

  ctx.body = { user };

});

module.exports = router.routes();