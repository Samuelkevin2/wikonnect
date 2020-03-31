const Router = require('koa-router');
const log = require('../utils/logger');
const Lesson = require('../models/lesson');
const permController = require('../middleware/permController');
const { validateLessons } = require('../middleware/validation/validatePostData');
const achievementPercentage = require('../utils/achievementPercentage');

const router = new Router({
  prefix: '/lessons'
});

async function returnType(parent) {
  if (parent.length == undefined) {
    parent.chapters.forEach(chapter => {
      return chapter.type = 'chapters';
    });
  } else {
    parent.forEach(mod => {
      mod.chapters.forEach(chapter => {
        return chapter.type = 'chapters';
      });
    });
  }
}


/**
 * @api {get} /lessons/:id GET single lesson.
 * @apiName GetALesson
 * @apiGroup Lessons
 * @apiPermission none
 * @apiVersion 0.4.0
 *
 * @apiSampleRequest off
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *      "lessons": {
 *        "id": "lessons1",
 *        "name": "A Lesson",
 *        "slug": "a-lesson",
 *        "description": "THis is a lesson.",
 *        "status": "published",
 *        "creatorId": "user1",
 *        "createdAt": "2017-12-20T19:17:10.000Z",
 *        "updatedAt": "2017-12-20T19:17:10.000Z",
 *        "chapters": [
 *          {
 *            "id": "chapter1",
 *            "name": "A Chapter",
 *            "type": "chapters"
 *          }
 *        ]
 *      }
 *    }
 *
 * @apiError {String} errors Bad Request.
 */

router.get('/:id', permController.requireAuth, async ctx => {
  const lesson = await Lesson.query().findById(ctx.params.id).eager('chapters(selectNameAndId)');

  await achievementPercentage(lesson, ctx.state.user.data.id);

  ctx.assert(lesson, 404, 'no lesson by that ID');
  log.error('The user path accessed does not exist');

  await returnType(lesson);
  ctx.status = 200;
  ctx.body = { lesson };
});



/**
 * @api {get} /lessons/ GET all lessons.
 * @apiName GetLessons
 * @apiGroup Lessons
 * @apiPermission none
 *
 * @apiSampleRequest off
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     "lessons": [{
 *        "id": "lesson1",
 *        "name": "A Lesson",
 *        "slug": "a-lesson",
 *        "description": "Contains Chapters.",
 *        "status": "published",
 *        "creatorId": "user1",
 *        "createdAt": "2017-12-20T16:17:10.000Z",
 *        "updatedAt": "2017-12-20T16:17:10.000Z",
 *        "chapters": [
 *            {
 *                "id": "chapter1",
 *                "name": "A Chapter",
 *                "type": "chapters"
 *            },
 *            {
 *                "id": "chapter2",
 *                "name": "A Chapter 2",
 *                "type": "chapters"
 *            },
 *            {
 *                "id": "chapter3",
 *                "name": "A Chapter3",
 *                "type": "chapters"
 *            },
 *            {
 *                "id": "chapter4",
 *                "name": "A Chapter4",
 *                "type": "chapters"
 *            }
 *        ],
 *        "percentage": {
 *            "type": "percentage",
 *            "percent": 75
 *        }
 *    }]
 * @apiError {String} errors Bad Request.
 */

router.get('/', permController.requireAuth, async ctx => {

  let lessons;
  try {
    lessons = await Lesson.query().where(ctx.query).eager('chapters(selectNameAndId)');

    await achievementPercentage(lessons, ctx.state.user.data.id);
    returnType(lessons);


  } catch (e) {
    if (e.statusCode) {
      ctx.throw(e.statusCode, { message: 'The query key does not exist' });
      ctx.throw(e.statusCode, null, { errors: [e.message] });
    } else { ctx.throw(400, null, { errors: ['Bad Request'] }); }
    throw e;
  }

  ctx.assert(lessons, 401, 'Something went wrong');


  ctx.status = 200;
  ctx.body = { lessons };
});


/**
 * @api {post} /lessons POST a lesson.
 * @apiName PostALesson
 * @apiGroup Lessons
 * @apiPermission none
 *
 * @apiParam {String} lesson[name] Name - Unique.
 * @apiParam {String} lesson[slug] Slug - Unique and autogenerated.
 * @apiParam {String} lesson[description] Description.
 * @apiParam {String} lesson[status] modules status - published | draft .
 * @apiParam {String} lesson[creatorId] Id of the User.
 *
 * @apiSampleRequest off
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 201 OK
 *     {
 *      "lesson": {
 *        "name": "lesson",
 *        "slug": "a-lesson",
 *        "description": "this is a lesson.",
 *        "status": "published",
 *        "creatorId": "user1",
 *      }
 *    }
 *
 * @apiError {String} errors Bad Request.
 */

router.post('/', permController.requireAuth, permController.grantAccess('createAny', 'path'), validateLessons, async ctx => {
  let newLesson = ctx.request.body.lesson;

  newLesson.slug = newLesson.name.replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-*|-*$/g, '')
    .toLowerCase();

  let lesson;
  try {
    lesson = await Lesson.query().insertAndFetch(newLesson);
  } catch (e) {
    if (e.statusCode) {
      ctx.throw(e.statusCode, null, { errors: [e.message] });
    } else { ctx.throw(400, null, { errors: ['Bad Request'] }); }
    throw e;
  }
  ctx.assert(lesson, 401, 'Something went wrong');

  ctx.status = 201;
  ctx.body = { lesson };

});

/**
 * @api {put} /lessons/:id PUT lesson.
 * @apiName PutALesson
 * @apiGroup Lessons
 * @apiPermission [admin, teacher, superadmin]
 *
 * @apiParam {String} lesson[name] Optional Name Unique.
 * @apiParam {String} lesson[slug] Optional Slug is Unique and autogenerated.
 * @apiParam {String} lesson[description] Optional Description.
 * @apiParam {String} lesson[status] lesson status[published or draft]
 *
 *
 * @apiSampleRequest off
 * @apiSuccess {String} lesson[object] Object data
 * @apiError {String} errors Bad Request.
 */

router.put('/:id', permController.requireAuth, permController.grantAccess('updateAny', 'path'), async ctx => {
  let newLesson = ctx.request.body.lesson;

  const checkLesson = await Lesson.query().findById(ctx.params.id);

  if (!checkLesson) {
    ctx.log.info('Error, path does not exists  %s for %s', ctx.request.ip, ctx.path);
    ctx.throw(400, 'That lesson path does not exist');
  }

  const lesson = await Lesson.query().patchAndFetchById(ctx.params.id, newLesson);

  ctx.status = 201;
  ctx.body = { lesson };

});

/**
 * @api {delete} /lessons/:id DELETE a lesson.
 * @apiName DeleteALesson
 * @apiGroup Lessons
 * @apiPermission [admin, superadmin]
 *
 * @apiSuccess {String} lesson[object] Object data
 * @apiError {String} errors Bad Request.
 */
router.delete('/:id', permController.grantAccess('deleteOwn', 'path'), async ctx => {
  const lesson = await Lesson.query().findById(ctx.params.id);

  if (!lesson) {
    ctx.throw(401, 'No record with id');
  }
  await Lesson.query().delete().where({ id: ctx.params.id });

  ctx.status = 200;
  ctx.body = { lesson };
});

module.exports = router.routes();
