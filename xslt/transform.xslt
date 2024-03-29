<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" >
    <!-- note, all have lower priority -->


    <xsl:import href="common.xslt"/>
    <xsl:import href="bill.xslt" />
    <xsl:import href="equations.xslt" />
    <xsl:import href="tables.xslt" />
    <xsl:import href="forms.xslt" />
    <xsl:import href="end.xslt" />
    <xsl:import href="schedules.xslt" />
    <xsl:import href="graphics.xslt" />


    <xsl:variable name="characters-insert-space">0123456789abcdefghijklmnopqrstuvwxyz</xsl:variable>
    <xsl:variable name="symbols-skip-insert-space"> ,.;:'`’")(</xsl:variable>


    <xsl:template match="/">
        <xsl:apply-templates />
    </xsl:template>


    <xsl:template name="current">
        <xsl:param name="class" />
        <xsl:if test="@current = 'true'">
           <xsl:attribute name="class">current <xsl:value-of select="$class"/></xsl:attribute>
        </xsl:if>
    </xsl:template>

    <xsl:template name="openbracket">
    <xsl:if test="not(contains(. ,'('))">(</xsl:if>
    </xsl:template>

    <xsl:template name="closebracket">
    <xsl:if test="not(contains(. ,'('))">)</xsl:if>
    </xsl:template>

    <xsl:template name="bracketlocation">
        <xsl:param name="label" />
        <xsl:choose>
            <xsl:when test="not(contains($label ,'('))">(<xsl:value-of select="$label"/>)</xsl:when>
            <xsl:otherwise><xsl:value-of select="$label"/></xsl:otherwise>
        </xsl:choose>
    </xsl:template>

 <xsl:template match="*[@amend.level1='struckout-draft']">
        <del class="struckout-draft">
            <xsl:apply-imports/>
        </del>
</xsl:template>

 <xsl:template match="*[@amend.level1='insert-draft']">
        <ins class="insert-draft">
            <xsl:apply-imports/>
        </ins>
</xsl:template>

    <xsl:template match="insertwords">
        <span class="insertwords"><xsl:apply-templates /></span>
    </xsl:template>

    <xsl:template match="struckoutwords">
        <span class="struckoutwords"><xsl:apply-templates /></span>
    </xsl:template>

<xsl:template name="string-replace-all">
  <xsl:param name="text" />
  <xsl:param name="replace" />
  <xsl:param name="by" />
  <xsl:choose>
    <xsl:when test="contains($text, $replace)">
      <xsl:value-of select="substring-before($text,$replace)" />
      <xsl:value-of select="$by" />
      <xsl:call-template name="string-replace-all">
        <xsl:with-param name="text"
        select="substring-after($text,$replace)" />
        <xsl:with-param name="replace" select="$replace" />
        <xsl:with-param name="by" select="$by" />
      </xsl:call-template>
    </xsl:when>
    <xsl:otherwise>
      <xsl:value-of select="$text" />
    </xsl:otherwise>
  </xsl:choose>
</xsl:template>

</xsl:stylesheet>