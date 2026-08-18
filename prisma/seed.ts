import {
  PrismaClient,
  StudentStatus,
  AttendanceStatus,
  InvoiceStatus,
  PaymentMethod,
  SubmissionStatus,
} from "@prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import { addDays, subMonths, startOfDay, eachDayOfInterval, getDay } from "date-fns"

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./prisma/dev.db",
})
const prisma = new PrismaClient({ adapter })

const STUDENT_NAMES = [
  { name: "Amaya Perera", grade: "10", fee: 800000 },
  { name: "Binura Silva", grade: "10", fee: 800000 },
  { name: "Chathura Fernando", grade: "10", fee: 750000 },
  { name: "Dilani Jayawardena", grade: "11", fee: 900000 },
  { name: "Eranda Wickramasinghe", grade: "11", fee: 900000 },
  { name: "Fathima Rahman", grade: "11", fee: 850000 },
  { name: "Gayan Kumara", grade: "9", fee: 700000 },
  { name: "Harshini De Silva", grade: "9", fee: 700000 },
  { name: "Ishara Mendis", grade: "9", fee: 650000 },
  { name: "Janani Peiris", grade: "12", fee: 1000000 },
  { name: "Kavindu Rajapaksa", grade: "12", fee: 1000000 },
  { name: "Lakshmi Nair", grade: "12", fee: 950000 },
]

const GUARDIAN_NAMES = [
  "Mr. Perera",
  "Mrs. Silva",
  "Mr. Fernando",
  "Mrs. Jayawardena",
  "Mr. Wickramasinghe",
  "Mrs. Rahman",
  "Mr. Kumara",
  "Mrs. De Silva",
  "Mr. Mendis",
  "Mrs. Peiris",
  "Mr. Rajapaksa",
  "Mrs. Nair",
]

const main = async () => {
  console.log("🌱 Seeding database...")

  await prisma.questionScore.deleteMany()
  await prisma.result.deleteMany()
  await prisma.question.deleteMany()
  await prisma.assessment.deleteMany()
  await prisma.submission.deleteMany()
  await prisma.assignment.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.attendance.deleteMany()
  await prisma.sessionTopic.deleteMany()
  await prisma.classSession.deleteMany()
  await prisma.scheduleSlot.deleteMany()
  await prisma.enrollment.deleteMany()
  await prisma.classGroup.deleteMany()
  await prisma.topic.deleteMany()
  await prisma.subject.deleteMany()
  await prisma.student.deleteMany()
  await prisma.settings.deleteMany()

  const settings = await prisma.settings.create({
    data: {
      teacherName: "Mr. Danuj Fernando",
      teacherPhone: "+94 77 123 4567",
      teacherEmail: "danuj@tuitionhub.lk",
      defaultFee: 800000,
      dueDayOfMonth: 5,
    },
  })

  const maths = await prisma.subject.create({
    data: { name: "Mathematics", description: "O/L and A/L Mathematics" },
  })
  const science = await prisma.subject.create({
    data: { name: "Science", description: "Combined Science for O/L" },
  })
  const english = await prisma.subject.create({
    data: { name: "English", description: "English Language and Literature" },
  })

  const mathsTopics = [
    "Algebra — Linear Equations",
    "Algebra — Quadratic Equations",
    "Geometry — Triangles",
    "Geometry — Circles",
    "Trigonometry — Basic Ratios",
    "Trigonometry — Identities",
    "Statistics — Mean & Median",
    "Probability — Basic Concepts",
  ]

  const scienceTopics = [
    "Biology — Cell Structure",
    "Biology — Photosynthesis",
    "Chemistry — Atomic Structure",
    "Chemistry — Chemical Bonding",
    "Physics — Forces & Motion",
    "Physics — Energy",
  ]

  const englishTopics = [
    "Grammar — Tenses",
    "Grammar — Prepositions",
    "Comprehension — Passage Analysis",
    "Essay Writing — Descriptive",
    "Essay Writing — Argumentative",
  ]

  const createdMathsTopics = await Promise.all(
    mathsTopics.map((title, i) =>
      prisma.topic.create({
        data: { subjectId: maths.id, grade: "10", title, sortOrder: i },
      })
    )
  )

  await Promise.all(
    scienceTopics.map((title, i) =>
      prisma.topic.create({
        data: { subjectId: science.id, grade: "9", title, sortOrder: i },
      })
    )
  )

  await Promise.all(
    englishTopics.map((title, i) =>
      prisma.topic.create({
        data: { subjectId: english.id, grade: "11", title, sortOrder: i },
      })
    )
  )

  const classGroups = await Promise.all([
    prisma.classGroup.create({
      data: {
        name: "Maths O/L Batch A",
        subjectId: maths.id,
        grade: "10",
        defaultMonthlyFee: 800000,
        colour: "#6366f1",
      },
    }),
    prisma.classGroup.create({
      data: {
        name: "Science Grade 9",
        subjectId: science.id,
        grade: "9",
        defaultMonthlyFee: 700000,
        colour: "#22c55e",
      },
    }),
    prisma.classGroup.create({
      data: {
        name: "English A/L Batch",
        subjectId: english.id,
        grade: "11",
        defaultMonthlyFee: 900000,
        colour: "#ec4899",
      },
    }),
  ])

  const [mathsClass, scienceClass, englishClass] = classGroups

  await Promise.all([
    prisma.scheduleSlot.createMany({
      data: [
        { classGroupId: mathsClass.id, dayOfWeek: 1, startTime: "16:00", endTime: "17:30", isTestSlot: false },
        { classGroupId: mathsClass.id, dayOfWeek: 3, startTime: "16:00", endTime: "17:30", isTestSlot: false },
        { classGroupId: mathsClass.id, dayOfWeek: 5, startTime: "16:00", endTime: "17:30", isTestSlot: false },
        { classGroupId: mathsClass.id, dayOfWeek: 6, startTime: "09:00", endTime: "11:00", isTestSlot: true },
        { classGroupId: scienceClass.id, dayOfWeek: 2, startTime: "15:00", endTime: "16:30", isTestSlot: false },
        { classGroupId: scienceClass.id, dayOfWeek: 4, startTime: "15:00", endTime: "16:30", isTestSlot: false },
        { classGroupId: englishClass.id, dayOfWeek: 1, startTime: "18:00", endTime: "19:30", isTestSlot: false },
        { classGroupId: englishClass.id, dayOfWeek: 4, startTime: "18:00", endTime: "19:30", isTestSlot: false },
      ],
    }),
  ])

  const students = await Promise.all(
    STUDENT_NAMES.map((s, i) =>
      prisma.student.create({
        data: {
          name: s.name,
          grade: s.grade,
          monthlyFee: s.fee,
          guardianName: GUARDIAN_NAMES[i],
          guardianPhone: `+94 77 ${100 + i}${100 + i} ${2000 + i}`,
          phone: `+94 71 ${200 + i}${200 + i} ${3000 + i}`,
          school: ["Royal College", "Ananda College", "Visakha Vidyalaya", "D.S. Senanayake"][i % 4],
          status: StudentStatus.ACTIVE,
          joinedAt: subMonths(new Date(), 3 + (i % 6)),
        },
      })
    )
  )

  const mathsStudents = students.filter((s) => s.grade === "10")
  const scienceStudents = students.filter((s) => s.grade === "9")
  const englishStudents = students.filter((s) => ["11", "12"].includes(s.grade))

  for (const s of mathsStudents) {
    await prisma.enrollment.create({ data: { studentId: s.id, classGroupId: mathsClass.id } })
  }
  for (const s of scienceStudents) {
    await prisma.enrollment.create({ data: { studentId: s.id, classGroupId: scienceClass.id } })
  }
  for (const s of englishStudents) {
    await prisma.enrollment.create({ data: { studentId: s.id, classGroupId: englishClass.id } })
  }

  const mathsSlots = await prisma.scheduleSlot.findMany({ where: { classGroupId: mathsClass.id } })
  const startDate = subMonths(new Date(), 2)
  const endDate = new Date()

  for (const slot of mathsSlots) {
    const dates = eachDayOfInterval({ start: startDate, end: endDate }).filter(
      (d) => getDay(d) === slot.dayOfWeek
    )
    for (const date of dates) {
      const session = await prisma.classSession.create({
        data: {
          classGroupId: mathsClass.id,
          date: startOfDay(date),
          startTime: slot.startTime,
          endTime: slot.endTime,
          status: date < new Date() ? "COMPLETED" : "SCHEDULED",
          isTest: slot.isTestSlot,
          homeworkNote: slot.isTestSlot ? null : `Complete exercises on ${createdMathsTopics[Math.floor(Math.random() * 4)]?.title ?? "Algebra"}`,
        },
      })

      if (!slot.isTestSlot && Math.random() > 0.3) {
        const topic = createdMathsTopics[Math.floor(Math.random() * createdMathsTopics.length)]
        await prisma.sessionTopic.create({
          data: { sessionId: session.id, topicId: topic.id },
        })
      }

      for (const student of mathsStudents) {
        const statuses: AttendanceStatus[] = ["PRESENT", "PRESENT", "PRESENT", "LATE", "ABSENT"]
        await prisma.attendance.create({
          data: {
            sessionId: session.id,
            studentId: student.id,
            status: date < new Date() ? statuses[Math.floor(Math.random() * statuses.length)] : "PRESENT",
          },
        })
      }
    }
  }

  const months = [
    { period: "2026-06", paid: true },
    { period: "2026-07", paid: true },
    { period: "2026-08", paid: false },
  ]

  for (const student of students) {
    for (const month of months) {
      const [year, mon] = month.period.split("-")
      const dueDate = new Date(parseInt(year), parseInt(mon) - 1, settings.dueDayOfMonth)

      const invoice = await prisma.invoice.create({
        data: {
          studentId: student.id,
          periodMonth: month.period,
          amountDue: student.monthlyFee,
          dueDate,
          status: month.paid ? InvoiceStatus.PAID : InvoiceStatus.UNPAID,
          discount: student.name.includes("Chathura") ? 50000 : 0,
        },
      })

      if (month.paid) {
        await prisma.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: student.monthlyFee - (student.name.includes("Chathura") ? 50000 : 0),
            paidAt: addDays(dueDate, -2),
            method: PaymentMethod.CASH,
            receiptNo: `RCP-${month.period.replace("-", "")}-${student.id.slice(-4)}`,
          },
        })
      } else if (student.name.includes("Binura")) {
        await prisma.invoice.update({
          where: { id: invoice.id },
          data: { status: InvoiceStatus.PARTIAL },
        })
        await prisma.payment.create({
          data: {
            invoiceId: invoice.id,
            amount: Math.floor(student.monthlyFee / 2),
            paidAt: addDays(dueDate, 3),
            method: PaymentMethod.BANK,
            receiptNo: `RCP-PARTIAL-${student.id.slice(-4)}`,
          },
        })
      }
    }
  }

  const assignment = await prisma.assignment.create({
    data: {
      classGroupId: mathsClass.id,
      title: "Quadratic Equations Worksheet",
      description: "Complete all 20 questions from the worksheet",
      dueDate: addDays(new Date(), 7),
      maxMarks: 100,
    },
  })

  for (const student of mathsStudents) {
    const statuses: SubmissionStatus[] = ["GRADED", "GRADED", "SUBMITTED", "PENDING", "MISSING"]
    const status = statuses[Math.floor(Math.random() * statuses.length)]
    await prisma.submission.create({
      data: {
        assignmentId: assignment.id,
        studentId: student.id,
        status,
        marks: status === "GRADED" ? 60 + Math.floor(Math.random() * 35) : null,
        submittedAt: status !== "PENDING" ? subMonths(new Date(), 0) : null,
      },
    })
  }

  const assessment = await prisma.assessment.create({
    data: {
      classGroupId: mathsClass.id,
      title: "Mid-Term Test — Algebra & Geometry",
      description: "Covers chapters 1-4",
      testDate: subMonths(new Date(), 1),
      maxMarks: 100,
    },
  })

  const questions = await Promise.all([
    prisma.question.create({
      data: { assessmentId: assessment.id, number: 1, text: "Solve: 2x + 5 = 15", maxMarks: 10, topicId: createdMathsTopics[0].id },
    }),
    prisma.question.create({
      data: { assessmentId: assessment.id, number: 2, text: "Factorize: x² - 5x + 6", maxMarks: 15, topicId: createdMathsTopics[1].id },
    }),
    prisma.question.create({
      data: { assessmentId: assessment.id, number: 3, text: "Find area of triangle with base 8cm, height 5cm", maxMarks: 15, topicId: createdMathsTopics[2].id },
    }),
    prisma.question.create({
      data: { assessmentId: assessment.id, number: 4, text: "Calculate circumference of circle r=7cm", maxMarks: 15, topicId: createdMathsTopics[3].id },
    }),
    prisma.question.create({
      data: { assessmentId: assessment.id, number: 5, text: "Prove: sin²θ + cos²θ = 1", maxMarks: 20, topicId: createdMathsTopics[4].id },
    }),
    prisma.question.create({
      data: { assessmentId: assessment.id, number: 6, text: "Calculate mean of: 12, 15, 18, 21, 24", maxMarks: 10, topicId: createdMathsTopics[6].id },
    }),
    prisma.question.create({
      data: { assessmentId: assessment.id, number: 7, text: "Probability of drawing red from 3R, 5B", maxMarks: 15, topicId: createdMathsTopics[7].id },
    }),
  ])

  for (const student of mathsStudents) {
    let total = 0
    for (const q of questions) {
      const marks = Math.floor(Math.random() * (q.maxMarks + 1))
      total += marks
      await prisma.questionScore.create({
        data: { questionId: q.id, studentId: student.id, marks },
      })
    }
    const pct = Math.round((total / 100) * 100)
    const grade = pct >= 75 ? "A" : pct >= 65 ? "B" : pct >= 55 ? "C" : pct >= 45 ? "S" : "F"
    await prisma.result.create({
      data: { assessmentId: assessment.id, studentId: student.id, totalMarks: total, grade },
    })
  }

  console.log("✅ Seed completed!")
  console.log(`   ${students.length} students`)
  console.log(`   ${classGroups.length} class groups`)
  console.log(`   ${months.length} months of invoices`)
  console.log(`   1 assessment with ${questions.length} questions`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
